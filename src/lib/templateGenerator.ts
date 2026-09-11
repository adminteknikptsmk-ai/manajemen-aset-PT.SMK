import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { PDFDocument, PDFRawStream, StandardFonts, rgb } from 'pdf-lib';
import * as pako from 'pako';
import { fillExcelTemplate, convertExcelToPdfBytes, extractPlaceholdersFromExcel } from './excelTemplateService';

/**
 * Extracts Google Drive File ID from various Google Drive / Docs / Sheets / Slides link formats.
 */
export function extractGoogleDriveFileId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) return matchD[1];

  const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) return matchId[1];

  return null;
}

/**
 * Transforms a Google Drive view URL into a direct download / PDF export stream URL.
 */
export function transformGoogleDriveUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;

  if (url.includes('docs.google.com/document/d/')) {
    const fileId = extractGoogleDriveFileId(url);
    if (fileId) return `https://docs.google.com/document/d/${fileId}/export?format=pdf`;
  }

  if (url.includes('docs.google.com/spreadsheets/d/')) {
    const fileId = extractGoogleDriveFileId(url);
    if (fileId) return `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`;
  }

  if (url.includes('drive.google.com')) {
    const fileId = extractGoogleDriveFileId(url);
    if (fileId) {
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
  }

  return url;
}

import { getLocalBlob } from './localBlobStorage';
import { resolveActiveKopSuratPdfBytes } from './kopSuratService';

/**
 * Downloads a file as an array buffer with Google Drive support and HTML response detection.
 */
export async function fetchFile(rawUrl: string): Promise<ArrayBuffer> {
  const url = rawUrl.startsWith('idb://') ? await getLocalBlob(rawUrl) : rawUrl;

  if (url.startsWith('data:')) {
    const base64 = url.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  const fileId = extractGoogleDriveFileId(url);
  const candidates: string[] = [];

  if (fileId) {
    // 1. Direct Google CDN endpoint (works for many publicly shared Google Drive files)
    candidates.push(`https://lh3.googleusercontent.com/d/${fileId}`);
    // 2. Google Docs PDF export
    if (url.includes('docs.google.com/document')) {
      candidates.push(`https://docs.google.com/document/d/${fileId}/export?format=pdf`);
    }
    // 3. Google Sheets XLSX export
    if (url.includes('docs.google.com/spreadsheets')) {
      candidates.push(`https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`);
    }
    // 4. Standard uc export
    candidates.push(`https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`);
    candidates.push(`https://docs.google.com/uc?export=download&id=${fileId}&confirm=t`);
    // 5. CORS proxies as high-reliability fallbacks
    candidates.push(`https://corsproxy.io/?${encodeURIComponent(`https://drive.google.com/uc?export=download&id=${fileId}`)}`);
    candidates.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(`https://drive.google.com/uc?export=download&id=${fileId}`)}`);
  } else {
    candidates.push(transformGoogleDriveUrl(url));
    if (transformGoogleDriveUrl(url) !== url) {
      candidates.push(url);
    }
  }

  let lastError: any = null;

  for (const targetUrl of candidates) {
    try {
      const res = await fetch(targetUrl);
      if (!res.ok) continue;

      const buffer = await res.arrayBuffer();
      if (!buffer || buffer.byteLength < 50) continue;

      // Inspect first 300 bytes for HTML response
      const headerText = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buffer.slice(0, 300))).trim();
      const isHtml = 
        headerText.toLowerCase().includes('<!doctype html') || 
        headerText.toLowerCase().includes('<html') || 
        headerText.toLowerCase().includes('google drive -');

      if (!isHtml) {
        return buffer; // Successfully fetched actual binary PDF/DOCX/XLSX!
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (fileId) {
    throw new Error(`LINK_GOOGLE_DRIVE_HTML:${fileId}`);
  }

  throw lastError || new Error(`Gagal mengunduh file template dari URL.`);
}

/**
 * Helper: Convert string to uppercase hex
 */
function textToHex(str: string): string {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex.toUpperCase();
}

/**
 * Helper: Convert hex string to text
 */
function hexToText(hex: string): string {
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}

/**
 * Extracts placeholders from an uploaded PDF or Excel template.
 */
export async function extractPlaceholdersFromTemplate(arrayBuffer: ArrayBuffer, fileName: string = ''): Promise<string[]> {
  const isExcel = fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls');
  if (isExcel) {
    return extractPlaceholdersFromExcel(arrayBuffer);
  }
  return extractPlaceholdersFromPdf(arrayBuffer);
}

/**
 * Extracts placeholders from an uploaded PDF template.
 * Scans both AcroForm text fields and content stream text patterns like {{FIELD_NAME}}.
 */
export async function extractPlaceholdersFromPdf(arrayBuffer: ArrayBuffer): Promise<string[]> {
  const placeholders = new Set<string>();

  try {
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

    // 1. Scan AcroForm form fields
    try {
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      fields.forEach(field => {
        const name = field.getName().trim();
        if (name) {
          placeholders.add(name);
        }
      });
    } catch {
      // Form may not exist in non-interactive PDFs
    }

    // 2. Scan Page Content Streams for {{...}} patterns
    const pageCount = pdfDoc.getPageCount();
    for (let pageIdx = 0; pageIdx < pageCount; pageIdx++) {
      const page = pdfDoc.getPage(pageIdx);
      const contents = page.node.Contents();
      if (!contents) continue;

      const streamRefs = (contents as any).asArray
        ? Array.from({ length: (contents as any).size() }, (_, i) => (contents as any).get(i))
        : [contents];

      for (const ref of streamRefs) {
        try {
          const streamObj = pdfDoc.context.lookup(ref) as any;
          if (!streamObj || typeof streamObj.getContents !== 'function') continue;

          const rawBytes: Uint8Array = streamObj.getContents();
          let decodedText = '';

          try {
            decodedText = new TextDecoder('utf-8', { fatal: false }).decode(pako.inflate(rawBytes));
          } catch {
            decodedText = new TextDecoder('utf-8', { fatal: false }).decode(rawBytes);
          }

          // A. Scan literal strings ( ... )
          const literalMatches = decodedText.matchAll(/\{\{([A-Za-z0-9_.\-]+)\}\}/g);
          for (const match of literalMatches) {
            placeholders.add(match[0]);
          }

          // B. Scan hex strings < ... >
          const hexMatches = decodedText.matchAll(/<([0-9a-fA-F\s]+)>/g);
          for (const hexMatch of hexMatches) {
            const cleanHex = hexMatch[1].replace(/\s+/g, '');
            if (cleanHex.length % 2 === 0) {
              const textFromHex = hexToText(cleanHex);
              const hexTokenMatches = textFromHex.matchAll(/\{\{([A-Za-z0-9_.\-]+)\}\}/g);
              for (const hMatch of hexTokenMatches) {
                placeholders.add(hMatch[0]);
              }
            }
          }
        } catch (streamErr) {
          console.warn('Could not inspect stream:', streamErr);
        }
      }
    }
  } catch (error) {
    console.error('Error scanning PDF placeholders:', error);
  }

  return Array.from(placeholders);
}

/**
 * Builds a replacement map from user mappings and data
 */
function buildReplacementDictionary(data: Record<string, any>, mappings?: Record<string, string>): Record<string, string> {
  const dictionary: Record<string, string> = {};

  // Direct data stringification
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val)) {
      dictionary[key] = val.map((v, i) => {
        if (typeof v === 'object' && v !== null) {
          return `${i + 1}. ` + Object.entries(v)
            .filter(([k]) => k !== 'id')
            .map(([k, subv]) => `${subv}`)
            .join(' | ');
        }
        return `${i + 1}. ${v}`;
      }).join('\n');
    } else {
      dictionary[key] = val !== undefined && val !== null ? String(val) : '';
    }
  }

  // Apply custom mappings: token -> systemKey
  if (mappings) {
    for (const [token, systemKey] of Object.entries(mappings)) {
      const targetVal = dictionary[systemKey] ?? (data[systemKey] !== undefined ? String(data[systemKey]) : '');
      dictionary[token] = targetVal;

      // Also support versions with and without curly braces
      const bareToken = token.replace(/[{}]/g, '').trim();
      dictionary[bareToken] = targetVal;
      dictionary[`{{${bareToken}}}`] = targetVal;
    }
  }

  return dictionary;
}

/**
 * Helper to safely encode text for PDF StandardFonts (Helvetica WinAnsi).
 * Replaces non-encodable characters like unicode bullets, smart quotes, em-dashes.
 */
export function safePdfText(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/[•●▪]/g, '-')
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’`´]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ')
    .trim();
}

/**
 * Helper to wrap text into multiple lines given max character count
 */
function wrapPdfText(text: string, maxChars: number): string[] {
  if (!text) return [];
  const clean = safePdfText(text);
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + ' ' + w : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * Creates the authentic official PT. SMK Surat Penawaran Harga (SPH) PDF
 * Clean layout specifically designed for pre-printed letterhead paper (kertas berkop fisik):
 * - No kop surat, logo, or background graphics embedded
 * - Precise top positions (measured from top edge of A4 paper):
 *   - "Nomor :" at 4.0 cm
 *   - "Perihal :" at 4.5 cm
 *   - "Lampiran :" at 5.0 cm
 *   - Dividing horizontal line at 5.5 cm
 *   - Letter content (Kepada Yth, date, intro, 9 terms, items/table, totals, signature)
 * - Bottom margin: exactly 3.0 cm empty space from bottom edge
 */
export async function createAuthenticSphPdf(
  pdfDocOrData: PDFDocument | Record<string, any>,
  dataOrSignature?: any,
  letterheadUrl?: string | null,
  signatureDataUrl?: string
): Promise<Uint8Array> {
  let pdfDoc: PDFDocument;
  let data: Record<string, any>;
  let activeSignature = signatureDataUrl;

  if (pdfDocOrData instanceof PDFDocument) {
    pdfDoc = pdfDocOrData;
    data = dataOrSignature || {};
  } else {
    pdfDoc = await PDFDocument.create();
    data = pdfDocOrData || {};
    if (typeof dataOrSignature === 'string' && !activeSignature && dataOrSignature.startsWith('data:image/')) {
      activeSignature = dataOrSignature;
    }
  }

  const fontBold = await pdfDoc.embedStandardFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedStandardFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedStandardFont(StandardFonts.HelveticaOblique);

  // Measurements & Constants (A4 Paper: 21.0 cm x 29.7 cm)
  const PAGE_WIDTH = 595.28;  // 21.0 cm in points
  const PAGE_HEIGHT = 841.89; // 29.7 cm in points
  const CM_TO_PT = 28.3464567;

  // Helper to convert cm from top edge to PDF Y-coordinate (origin at bottom-left)
  const yFromTop = (cm: number): number => PAGE_HEIGHT - (cm * CM_TO_PT);

  // Margins
  const marginX = 54; // ~1.9 cm left/right margin
  const rightX = PAGE_WIDTH - marginX; // 541.28 pt

  // Digital Signature (if provided by user in signature pad)
  let embeddedSigImg: any = null;
  const targetSig = activeSignature || data?.signatureImage || data?.signatureUrl || data?.signature;
  if (targetSig && targetSig.startsWith('data:image/')) {
    try {
      const isPng = targetSig.includes('image/png');
      const base64Data = targetSig.split(',')[1];
      const sigBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      embeddedSigImg = isPng ? await pdfDoc.embedPng(sigBytes) : await pdfDoc.embedJpg(sigBytes);
    } catch (sigErr) {
      console.warn('Could not embed signature image:', sigErr);
    }
  }

  const formatCurrencyPdf = (val: any): string => {
    if (val === undefined || val === null || val === '' || val === '-') return 'Rp -';
    if (typeof val === 'string' && val.startsWith('Rp')) return val;
    const num = typeof val === 'number' ? val : Number(String(val).replace(/[^0-9.-]+/g, '')) || 0;
    if (num === 0) return 'Rp -';
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // =========================================================================
  // HALAMAN 1: SURAT PENGANTAR RESMI PENAWARAN HARGA (SPH)
  // Clean canvas for pre-printed letterhead paper (tanpa kop surat & logo)
  // =========================================================================
  const page1 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // Precise Top Positions:
  // 1. "Nomor :" at 4.0 cm from top
  const nomorY = yFromTop(4.0);
  page1.drawText('Nomor', { x: marginX, y: nomorY, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
  page1.drawText(':', { x: marginX + 48, y: nomorY, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
  page1.drawText(safePdfText(data.sphNumber || '-'), { x: marginX + 58, y: nomorY, size: 8.5, font: fontBold, color: rgb(0, 0, 0) });

  // 2. "Perihal :" at 4.5 cm from top
  const perihalY = yFromTop(4.5);
  page1.drawText('Perihal', { x: marginX, y: perihalY, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
  page1.drawText(':', { x: marginX + 48, y: perihalY, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
  page1.drawText(safePdfText(data.subject || 'Surat Penawaran Harga Kalibrasi'), { x: marginX + 58, y: perihalY, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });

  // 3. "Lampiran :" at 5.0 cm from top
  const lampiranY = yFromTop(5.0);
  page1.drawText('Lampiran', { x: marginX, y: lampiranY, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
  page1.drawText(':', { x: marginX + 48, y: lampiranY, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
  page1.drawText(safePdfText(data.attachmentPages || '1 Lembar'), { x: marginX + 58, y: lampiranY, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });

  // 4. Dividing horizontal line at 5.5 cm from top
  const lineY = yFromTop(5.5);
  page1.drawLine({
    start: { x: marginX, y: lineY },
    end: { x: rightX, y: lineY },
    thickness: 0.8,
    color: rgb(0.15, 0.15, 0.15)
  });

  // 5. Letter Content below line (starting around 6.0 cm from top)
  // Date on right (e.g. "Surakarta, 09 September 2026")
  let contentY = yFromTop(6.0);
  const rightDateStr = safePdfText(data.formattedDate || `${data.city || 'Surakarta'}, ${data.date || new Date().toLocaleDateString('id-ID')}`);
  const dateWidth = fontRegular.widthOfTextAtSize(rightDateStr, 8.5);
  page1.drawText(rightDateStr, { x: rightX - dateWidth, y: contentY, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });

  // Recipient info on left (Kepada Yth)
  page1.drawText('Kepada Yth:', { x: marginX, y: contentY, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
  contentY -= 12;
  page1.drawText(safePdfText(data.recipientRole || 'Direktur'), { x: marginX, y: contentY, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
  contentY -= 12;
  page1.drawText(safePdfText(data.hospitalName || '-'), { x: marginX, y: contentY, size: 8.5, font: fontBold, color: rgb(0, 0, 0) });
  if (data.hospitalAddress) {
    const addrLines = wrapPdfText(String(data.hospitalAddress), 80);
    for (const al of addrLines.slice(0, 2)) {
      contentY -= 11;
      page1.drawText(safePdfText(al), { x: marginX, y: contentY, size: 8, font: fontRegular, color: rgb(0.25, 0.25, 0.25) });
    }
  }

  // Opening text (Dengan Hormat,)
  contentY -= 15;
  page1.drawText('Dengan Hormat,', { x: marginX, y: contentY, size: 8.5, font: fontBold, color: rgb(0, 0, 0) });
  contentY -= 12;

  const introText = 'Menindaklanjuti mengenai permintaan Kalibrasi alat Kesehatan, PT. Sarana Multi Kalibrasi telah memiliki izin dari Kementrian Kesehatan dengan No. 26062301565850001, Sertifikat Akreditasi KAN LK-532-IDN serta menerapkan Standar SNI ISO/ IEC 17025: 2017, melampirkan harga penawaran, adapun ketentuan yang berlaku sebagai berikut:';
  const introLines = wrapPdfText(introText, 88);
  for (const line of introLines) {
    page1.drawText(safePdfText(line), { x: marginX, y: contentY, size: 8, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
    contentY -= 11;
  }
  contentY -= 2;

  // 9 Terms and conditions
  const isPpnInc = data.isPpnIncluded !== false && data.isPpnIncluded !== 'false';
  const terms = [
    isPpnInc ? 'Harga sudah termasuk PPN 11%.' : 'Harga belum termasuk PPN 11%.',
    'Harga sudah termasuk biaya transportasi dan akomodasi.',
    'Harga tidak termasuk service dan maintenance.',
    'Penawaran berlaku 1 bulan, sejak tanggal penawaran diterbitkan.',
    'Selama pekerjaan (on site) teknisi kami wajib didampingi oleh petugas atau staff setempat dalam proses kalibrasi.',
    'Apabila terdapat penambahan alat pada saat kalibrasi, segera dimutakhirkan BO (Bukti Order) dan di setujui pelanggan.',
    'Pekerjaan dianggap selesai setelah berita acara/BO (Bukti Order) di tanda tangani oleh pihak yang berwenang.',
    'Kalibrasi di atas termasuk sertifikat kalibrasi yang dikeluarkan oleh PT. Sarana Multi Kalibrasi.',
    `Pembayaran : ${data.bankName || 'Bank Mandiri Cab. Surakarta'}\n               No. Rek : ${data.bankAccountNumber || '138-00-2610846-9'} (${data.bankAccountName || 'SARANA MULTI KALIBRASI PT'})`
  ];

  for (let i = 0; i < terms.length; i++) {
    const prefix = `${i + 1}. `;
    const termItem = terms[i];
    const subLines = termItem.split('\n');

    for (let s = 0; s < subLines.length; s++) {
      const lineStr = subLines[s];
      const wrapped = wrapPdfText(lineStr, 82);
      if (s === 0) {
        page1.drawText(prefix, { x: marginX + 8, y: contentY, size: 8, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
        page1.drawText(safePdfText(wrapped[0]), { x: marginX + 20, y: contentY, size: 8, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
        contentY -= 10.5;
        for (let l = 1; l < wrapped.length; l++) {
          page1.drawText(safePdfText(wrapped[l]), { x: marginX + 20, y: contentY, size: 8, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
          contentY -= 10.5;
        }
      } else {
        page1.drawText(safePdfText(lineStr), { x: marginX + 20, y: contentY, size: 8, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
        contentY -= 10.5;
      }
    }
  }

  contentY -= 3;
  const closing1 = 'Bersama ini kami bermaksud mengajukan permohonan persetujuan Surat Penawaran Harga.';
  page1.drawText(safePdfText(closing1), { x: marginX, y: contentY, size: 8, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
  contentY -= 11;

  const marketingInfo = `Untuk informasi lebih lanjut dapat menghubungi marketing kami di : ${data.marketingStaffPhone || '0812-4484-2383'} (${data.marketingStaffName || 'Ari'}). Demikian, atas perhatian dan kerjasamanya kami ucapkan terimakasih.`;
  const closing2Lines = wrapPdfText(marketingInfo, 88);
  for (const cl of closing2Lines) {
    page1.drawText(safePdfText(cl), { x: marginX, y: contentY, size: 8, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
    contentY -= 10.5;
  }

  // Signatures on Page 1 (guaranteed well above 3.0 cm bottom margin = 85.04 pt)
  const minBottomMarginPt = 3.0 * CM_TO_PT; // 85.04 pt from bottom
  const sigY = Math.max(contentY - 12, minBottomMarginPt + 75);

  // Left: PT SMK
  page1.drawText('PT. SARANA MULTI KALIBRASI', { x: marginX, y: sigY, size: 8.5, font: fontBold, color: rgb(0, 0, 0) });
  if (embeddedSigImg) {
    page1.drawImage(embeddedSigImg, { x: marginX, y: sigY - 38, width: 85, height: 34 });
  }
  page1.drawText(safePdfText(data.directorName || 'Ahmad Fajar Ariyanto'), { x: marginX, y: sigY - 44, size: 8.5, font: fontBold, color: rgb(0, 0, 0) });
  page1.drawLine({ start: { x: marginX, y: sigY - 46 }, end: { x: marginX + 140, y: sigY - 46 }, thickness: 0.8, color: rgb(0.2, 0.2, 0.2) });
  page1.drawText(safePdfText(data.directorTitle || 'Direktur'), { x: marginX, y: sigY - 56, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });

  // Right: Pelanggan
  page1.drawText('Disetujui oleh Pelanggan,', { x: rightX - 160, y: sigY, size: 8.5, font: fontBold, color: rgb(0, 0, 0) });
  page1.drawText('( ……………………………… )', { x: rightX - 160, y: sigY - 44, size: 8.5, font: fontBold, color: rgb(0, 0, 0) });

  // Tembusan & Catatan if provided (only if space allows above 3 cm bottom margin)
  let noteY = sigY - 68;
  if (noteY > minBottomMarginPt) {
    if (data.tembusan && data.tembusan !== '-') {
      page1.drawText(safePdfText(`Tembusan: ${data.tembusan}`), { x: marginX, y: noteY, size: 7.5, font: fontRegular, color: rgb(0.35, 0.35, 0.35) });
      noteY -= 9;
    }
    if (data.notes && data.notes !== '-' && noteY > minBottomMarginPt) {
      page1.drawText(safePdfText(`Catatan: ${data.notes}`), { x: marginX, y: noteY, size: 7.5, font: fontRegular, color: rgb(0.35, 0.35, 0.35) });
    }
  }

  // =========================================================================
  // HALAMAN 2+: LAMPIRAN RINCIAN PENAWARAN HARGA (TABEL PERANGKAT)
  // Clean canvas for pre-printed letterhead paper (tanpa kop surat & logo)
  // =========================================================================
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items = rawItems.length > 0 ? rawItems : [
    { no: 1, description: 'Jasa Kalibrasi Alat Kesehatan', quantity: 1, unit: 'Unit', unitPrice: data.grandTotal || '0', totalPrice: data.grandTotal || '0' }
  ];

  const totalQty = items.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);

  // Pagination for items: up to 20 items per page
  const itemsPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageN = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    // Top Metadata on Lampiran Page (same exact cm positions: 4.0cm, 4.5cm, 5.0cm, line 5.5cm)
    const metaNY = yFromTop(4.0);
    pageN.drawText('Nomor', { x: marginX, y: metaNY, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    pageN.drawText(':', { x: marginX + 48, y: metaNY, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    pageN.drawText(safePdfText(data.sphNumber || '-'), { x: marginX + 58, y: metaNY, size: 8.5, font: fontBold, color: rgb(0, 0, 0) });

    const perihalNY = yFromTop(4.5);
    pageN.drawText('Perihal', { x: marginX, y: perihalNY, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    pageN.drawText(':', { x: marginX + 48, y: perihalNY, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    pageN.drawText(safePdfText(data.subject || 'Surat Penawaran Harga Kalibrasi'), { x: marginX + 58, y: perihalNY, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });

    const lampiranNY = yFromTop(5.0);
    pageN.drawText('Lampiran', { x: marginX, y: lampiranNY, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    pageN.drawText(':', { x: marginX + 48, y: lampiranNY, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    pageN.drawText(safePdfText(data.attachmentPages || '1 Lembar'), { x: marginX + 58, y: lampiranNY, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });

    // Divider line at 5.5 cm
    const lineNY = yFromTop(5.5);
    pageN.drawLine({
      start: { x: marginX, y: lineNY },
      end: { x: rightX, y: lineNY },
      thickness: 0.8,
      color: rgb(0.15, 0.15, 0.15)
    });

    // Centered Framed Box: "Surat Penawaran Harga" (around 6.3 cm)
    const titleBoxW = 200;
    const titleBoxH = 17;
    const titleBoxX = (PAGE_WIDTH - titleBoxW) / 2;
    const titleBoxY = yFromTop(6.3);

    pageN.drawRectangle({
      x: titleBoxX,
      y: titleBoxY,
      width: titleBoxW,
      height: titleBoxH,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.8,
      color: rgb(1, 1, 1)
    });
    pageN.drawText('Surat Penawaran Harga', {
      x: titleBoxX + 36,
      y: titleBoxY + 4.5,
      size: 9.5,
      font: fontBold,
      color: rgb(0, 0, 0)
    });

    // Table Setup
    // Columns: No (28), Diskripsi (184), Qty (30), Satuan (42), Satuan Harga (78), Total Harga (125.28) = 487.28 pt
    const colX = {
      no: marginX,
      desc: marginX + 28,
      qty: marginX + 212,
      unit: marginX + 242,
      price: marginX + 284,
      total: marginX + 362,
      end: rightX
    };
    const tableWidth = colX.end - colX.no; // 487.28 pt

    let tableY = titleBoxY - 14;
    const thH = 16;

    // Header Background: Clean cyan/light gray with solid border
    pageN.drawRectangle({
      x: colX.no,
      y: tableY - thH,
      width: tableWidth,
      height: thH,
      color: rgb(0.92, 0.95, 0.98),
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.8
    });

    // Vertical borders for header
    [colX.desc, colX.qty, colX.unit, colX.price, colX.total].forEach((vx) => {
      pageN.drawLine({
        start: { x: vx, y: tableY },
        end: { x: vx, y: tableY - thH },
        thickness: 0.8,
        color: rgb(0, 0, 0)
      });
    });

    // Header Text
    pageN.drawText('No.', { x: colX.no + 7, y: tableY - 11, size: 8, font: fontBold, color: rgb(0, 0, 0) });
    pageN.drawText('Diskripsi', { x: colX.desc + 65, y: tableY - 11, size: 8, font: fontBold, color: rgb(0, 0, 0) });
    pageN.drawText('Qty', { x: colX.qty + 6, y: tableY - 11, size: 8, font: fontBold, color: rgb(0, 0, 0) });
    pageN.drawText('Satuan', { x: colX.unit + 6, y: tableY - 11, size: 8, font: fontBold, color: rgb(0, 0, 0) });
    pageN.drawText('Satuan Harga', { x: colX.price + 10, y: tableY - 11, size: 8, font: fontBold, color: rgb(0, 0, 0) });
    pageN.drawText('Total Harga', { x: colX.total + 36, y: tableY - 11, size: 8, font: fontBold, color: rgb(0, 0, 0) });

    tableY -= thH;

    // Table Data Rows
    const startIdx = pageIdx * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, items.length);
    const pageItems = items.slice(startIdx, endIdx);
    const rowH = 14;

    for (let r = 0; r < pageItems.length; r++) {
      const it = pageItems[r];
      const rowY = tableY;

      // Outer row border
      pageN.drawRectangle({
        x: colX.no,
        y: rowY - rowH,
        width: tableWidth,
        height: rowH,
        borderColor: rgb(0, 0, 0),
        borderWidth: 0.5,
        color: rgb(1, 1, 1)
      });

      // Vertical cell dividers
      [colX.desc, colX.qty, colX.unit, colX.price, colX.total].forEach((vx) => {
        pageN.drawLine({
          start: { x: vx, y: rowY },
          end: { x: vx, y: rowY - rowH },
          thickness: 0.5,
          color: rgb(0, 0, 0)
        });
      });

      const itemNo = safePdfText(it.no || startIdx + r + 1);
      const itemDesc = safePdfText(it.description || it.namaAlat || '-').substring(0, 42);
      const itemQty = safePdfText(it.quantity || '1');
      const itemUnit = safePdfText(it.unit || 'Unit');
      const itemPrice = formatCurrencyPdf(it.unitPrice || '0');
      const itemTotal = formatCurrencyPdf(it.totalPrice || '0');

      // Center No
      pageN.drawText(itemNo, { x: colX.no + (itemNo.length > 1 ? 6 : 10), y: rowY - 10, size: 7.5, font: fontRegular });
      // Left Diskripsi
      pageN.drawText(itemDesc, { x: colX.desc + 4, y: rowY - 10, size: 7.5, font: fontRegular });
      // Center Qty
      pageN.drawText(itemQty, { x: colX.qty + 10, y: rowY - 10, size: 7.5, font: fontRegular });
      // Center Unit
      pageN.drawText(itemUnit, { x: colX.unit + 9, y: rowY - 10, size: 7.5, font: fontRegular });
      // Right Satuan Harga
      pageN.drawText(itemPrice, { x: colX.price + 5, y: rowY - 10, size: 7.5, font: fontRegular });
      // Right Total Harga
      pageN.drawText(itemTotal, { x: colX.total + 28, y: rowY - 10, size: 7.5, font: fontRegular });

      tableY -= rowH;
    }

    // IF LAST PAGE: Draw Summary Block (5 rows) & Terbilang Box & Footnotes
    if (pageIdx === totalPages - 1) {
      const summaryRowH = 13.5;

      // Row 1: Jumlah & Total 1
      pageN.drawRectangle({ x: colX.no, y: tableY - summaryRowH, width: tableWidth, height: summaryRowH, borderColor: rgb(0, 0, 0), borderWidth: 0.5, color: rgb(1, 1, 1) });
      [colX.desc, colX.qty, colX.unit, colX.price, colX.total].forEach(vx => {
        pageN.drawLine({ start: { x: vx, y: tableY }, end: { x: vx, y: tableY - summaryRowH }, thickness: 0.5, color: rgb(0, 0, 0) });
      });
      pageN.drawText('Jumlah', { x: colX.desc + 65, y: tableY - 9.5, size: 7.5, font: fontBold });
      pageN.drawText(String(totalQty), { x: colX.qty + 8, y: tableY - 9.5, size: 7.5, font: fontBold });
      pageN.drawText('Unit', { x: colX.unit + 9, y: tableY - 9.5, size: 7.5, font: fontRegular });
      pageN.drawText('Total 1', { x: colX.price + 16, y: tableY - 9.5, size: 7.5, font: fontBold });
      pageN.drawText(formatCurrencyPdf(data.subtotal1), { x: colX.total + 28, y: tableY - 9.5, size: 7.5, font: fontBold });
      tableY -= summaryRowH;

      // Next 4 Summary rows: Akomodasi, Total 2, PPN 11%, GRAND TOTAL
      const summaryRows = [
        { label: 'Akomodasi', val: data.accommodationFee ? formatCurrencyPdf(data.accommodationFee) : 'Rp -', isGrand: false },
        { label: 'Total 2', val: formatCurrencyPdf(data.subtotal2 || data.subtotal1), isGrand: false },
        { label: isPpnInc ? 'PPN 11%' : 'PPN 11% (Non)', val: formatCurrencyPdf(data.ppnAmount), isGrand: false },
        { label: 'GRAND TOTAL', val: formatCurrencyPdf(data.grandTotal), isGrand: true }
      ];

      for (let s = 0; s < summaryRows.length; s++) {
        const sr = summaryRows[s];
        const isCyan = sr.isGrand;

        pageN.drawRectangle({
          x: colX.price,
          y: tableY - summaryRowH,
          width: colX.end - colX.price,
          height: summaryRowH,
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.5,
          color: isCyan ? rgb(0.88, 0.94, 0.98) : rgb(1, 1, 1)
        });

        pageN.drawLine({
          start: { x: colX.total, y: tableY },
          end: { x: colX.total, y: tableY - summaryRowH },
          thickness: 0.5,
          color: rgb(0, 0, 0)
        });

        pageN.drawText(sr.label, {
          x: colX.price + (isCyan ? 8 : 12),
          y: tableY - 9.5,
          size: 7.5,
          font: fontBold,
          color: rgb(0, 0, 0)
        });

        pageN.drawText(sr.val, {
          x: colX.total + 28,
          y: tableY - 9.5,
          size: 7.5,
          font: fontBold,
          color: rgb(0, 0, 0)
        });

        tableY -= summaryRowH;
      }

      // Left Box: Terbilang Box (spanning from x=colX.no to colX.price, height = 4 * summaryRowH = 54 pt)
      const terbilangBoxH = 4 * summaryRowH;
      const terbilangTopY = tableY + terbilangBoxH;

      pageN.drawRectangle({
        x: colX.no,
        y: tableY,
        width: colX.price - colX.no,
        height: terbilangBoxH,
        borderColor: rgb(0, 0, 0),
        borderWidth: 0.5,
        color: rgb(1, 1, 1)
      });

      pageN.drawText('Terbilang:', { x: colX.no + 6, y: terbilangTopY - 10, size: 7.5, font: fontBold });
      if (data.terbilang) {
        const terbilangLines = wrapPdfText(`"${data.terbilang}"`, 44);
        let tY = terbilangTopY - 21;
        for (const tl of terbilangLines.slice(0, 3)) {
          pageN.drawText(safePdfText(tl), { x: colX.no + 6, y: tY, size: 7, font: fontOblique, color: rgb(0.1, 0.1, 0.1) });
          tY -= 9;
        }
      }

      // Footnotes under Table (Asterisks)
      tableY -= 10;
      const footnotes = [
        '*Hanya dilakukan Uji Keselamatan Listrik dan/atau Uji Fungsi dan Kondisi Alat',
        '**Alat dilakukan penarikan ke PT Sarana Multi Kalibrasi',
        '***Alat dilakukan penarikan untuk subkontraktor pekerjaan',
        '****Tidak termasuk jenis alat wajib kalibrasi'
      ];

      for (const fn of footnotes) {
        if (tableY > minBottomMarginPt) {
          pageN.drawText(safePdfText(fn), {
            x: colX.no,
            y: tableY,
            size: 6.8,
            font: fontRegular,
            color: rgb(0.25, 0.25, 0.25)
          });
          tableY -= 9;
        }
      }
    }
  }

  return await pdfDoc.save();
}

/**
 * Creates a clean default A4 PDF document containing header & system data fields.
 * Used as a fallback when a PDF template cannot be loaded directly (e.g. Google Drive link or corrupted file).
 */
export async function createCleanDefaultPdf(
  data: Record<string, any>,
  mappings?: Record<string, string>,
  signatureDataUrl?: string,
  letterheadUrl?: string | null
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // If this is an SPH document (has sphNumber or items or penawaran), generate the authentic official 2-page PT. SMK SPH!
  const isSph = !!data.sphNumber || (Array.isArray(data.items) && data.items.length > 0) || (data.subject && String(data.subject).toLowerCase().includes('penawaran'));
  if (isSph) {
    try {
      return await createAuthenticSphPdf(pdfDoc, data, letterheadUrl, signatureDataUrl);
    } catch (sphErr) {
      console.error('Error generating authentic SPH PDF:', sphErr);
    }
  }

  const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size
  const { width, height } = page.getSize();
  
  const fontBold = await pdfDoc.embedStandardFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedStandardFont(StandardFonts.Helvetica);

  let startContentY = height - 120;

  // If letterhead is provided, draw it at top
  let hasLetterhead = false;
  if (letterheadUrl) {
    try {
      const lhBuffer = await fetchFile(letterheadUrl);
      const isPng = letterheadUrl.startsWith('data:image/png') || letterheadUrl.endsWith('.png');
      const isJpg = letterheadUrl.startsWith('data:image/jpeg') || letterheadUrl.startsWith('data:image/jpg') || letterheadUrl.endsWith('.jpg') || letterheadUrl.endsWith('.jpeg');
      const isImg = isPng || isJpg || letterheadUrl.startsWith('data:image/');

      if (isImg) {
        let img: any;
        try {
          img = isPng ? await pdfDoc.embedPng(lhBuffer) : await pdfDoc.embedJpg(lhBuffer);
        } catch {
          try {
            img = await pdfDoc.embedPng(lhBuffer);
          } catch {
            img = await pdfDoc.embedJpg(lhBuffer);
          }
        }
        if (img) {
          const aspect = img.width / img.height;
          if (aspect < 0.8) {
            page.drawImage(img, { x: 0, y: 0, width, height });
            startContentY = height - 130;
          } else {
            const bannerH = width / aspect;
            page.drawImage(img, { x: 0, y: height - bannerH, width, height: bannerH });
            startContentY = height - bannerH - 20;
          }
          hasLetterhead = true;
        }
      } else {
        const lhDoc = await PDFDocument.load(lhBuffer, { ignoreEncryption: true });
        if (lhDoc.getPageCount() > 0) {
          const [embeddedLh] = await pdfDoc.embedPdf(lhDoc, [0]);
          page.drawPage(embeddedLh, { x: 0, y: 0, width, height, opacity: 1 });
          hasLetterhead = true;
          startContentY = height - 130;
        }
      }
    } catch (e) {
      console.warn('Could not overlay letterhead in createCleanDefaultPdf:', e);
    }
  }

  if (!hasLetterhead) {
    // Header Banner
    page.drawRectangle({
      x: 0,
      y: height - 70,
      width,
      height: 70,
      color: rgb(0.11, 0.4, 0.55),
    });

    page.drawText('PT. SARANA MULTI KALIBRASI', {
      x: 40,
      y: height - 35,
      size: 16,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(safePdfText('Laboratorium Uji & Kalibrasi Alat Kesehatan | LK-532-IDN'), {
      x: 40,
      y: height - 52,
      size: 9,
      font: fontRegular,
      color: rgb(0.85, 0.95, 1),
    });
    startContentY = height - 100;
  }

  // Title
  const docTitle = safePdfText(data.subject || data.documentTitle || 'DOKUMEN RESMI PT. SARANA MULTI KALIBRASI').toUpperCase();
  page.drawText(docTitle, {
    x: 40,
    y: startContentY,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawLine({
    start: { x: 40, y: startContentY - 8 },
    end: { x: width - 40, y: startContentY - 8 },
    thickness: 1.5,
    color: rgb(0.11, 0.4, 0.55),
  });

  // Render structured document metadata table (clean and professional)
  let currentY = startContentY - 30;
  const metaRows: [string, string][] = [
    ['Nomor Dokumen', safePdfText(data.sphNumber || data.spkNumber || data.bapNumber || data.documentNumber || '-')],
    ['Rumah Sakit / Faskes', safePdfText(data.hospitalName || '-')],
    ['Alamat Lokasi', safePdfText(data.hospitalAddress || data.city || '-')],
    ['Tanggal Dokumen', safePdfText(data.date || new Date().toLocaleDateString('id-ID'))],
    ['Perihal / Pekerjaan', safePdfText(data.subject || data.workScope || 'Layanan Kalibrasi & Uji Alat Kesehatan')],
    ['Total Nilai', safePdfText(data.grandTotal ? `Rp ${data.grandTotal}` : '-')],
  ];

  page.drawRectangle({
    x: 40,
    y: currentY - (metaRows.length * 20),
    width: width - 80,
    height: metaRows.length * 20 + 8,
    color: rgb(0.97, 0.98, 0.99),
    borderColor: rgb(0.82, 0.86, 0.90),
    borderWidth: 1,
  });

  for (const [lbl, val] of metaRows) {
    page.drawText(lbl, {
      x: 55,
      y: currentY - 12,
      size: 9,
      font: fontBold,
      color: rgb(0.15, 0.3, 0.45),
    });

    page.drawText(':', {
      x: 180,
      y: currentY - 12,
      size: 9,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText(val, {
      x: 195,
      y: currentY - 12,
      size: 9,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });

    currentY -= 20;
  }

  currentY -= 20;

  // Footer Signature Section
  const targetSigOther = signatureDataUrl || data?.signatureImage || data?.signatureUrl || data?.mtSignatureUrl || data?.signature;
  if (targetSigOther && targetSigOther.startsWith('data:image/')) {
    try {
      const isPng = targetSigOther.includes('image/png');
      const base64Data = targetSigOther.split(',')[1];
      const sigBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const sigImg = isPng ? await pdfDoc.embedPng(sigBytes) : await pdfDoc.embedJpg(sigBytes);
      
      page.drawText('Manajemen Teknik / Petugas:', {
        x: width - 210,
        y: 110,
        size: 9,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });

      page.drawImage(sigImg, {
        x: width - 210,
        y: 45,
        width: 120,
        height: 50,
      });
    } catch {
      // Signature embed fallback
    }
  }

  return await pdfDoc.save();
}

/**
 * Injects data into a PDF template using AcroForm filling and stream search-and-replace.
 * Also supports overlaying onto uploaded Kop Surat (blank A4 letterhead).
 */
export async function searchAndReplaceInPdf(
  arrayBuffer: ArrayBuffer,
  data: Record<string, any>,
  mappings?: Record<string, string>,
  signatureDataUrl?: string,
  letterheadUrl?: string | null
): Promise<Uint8Array> {
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  } catch (pdfErr) {
    console.warn('Could not load PDF template bytes directly, generating clean default PDF:', pdfErr);
    return await createCleanDefaultPdf(data, mappings, signatureDataUrl, letterheadUrl);
  }

  // If a custom Kop Surat letterhead is configured, blend it into page 1
  if (letterheadUrl) {
    try {
      const lhBuffer = await fetchFile(letterheadUrl);
      const firstPage = pdfDoc.getPages()[0];
      if (firstPage) {
        const { width, height } = firstPage.getSize();
        const isPng = letterheadUrl.startsWith('data:image/png') || letterheadUrl.endsWith('.png');
        const isJpg = letterheadUrl.startsWith('data:image/jpeg') || letterheadUrl.startsWith('data:image/jpg') || letterheadUrl.endsWith('.jpg') || letterheadUrl.endsWith('.jpeg');
        const isImg = isPng || isJpg || letterheadUrl.startsWith('data:image/');

        if (isImg) {
          try {
            let img: any;
            try {
              img = isPng ? await pdfDoc.embedPng(lhBuffer) : await pdfDoc.embedJpg(lhBuffer);
            } catch {
              try {
                img = await pdfDoc.embedPng(lhBuffer);
              } catch {
                img = await pdfDoc.embedJpg(lhBuffer);
              }
            }

            if (img) {
              const aspect = img.width / img.height;
              if (aspect < 0.8) {
                firstPage.drawImage(img, { x: 0, y: 0, width, height });
              } else {
                const bannerH = width / aspect;
                firstPage.drawImage(img, { x: 0, y: height - bannerH, width, height: bannerH });
              }
            }
          } catch (imgErr) {
            console.warn('Could not overlay letterhead image:', imgErr);
          }
        } else {
          try {
            const lhDoc = await PDFDocument.load(lhBuffer, { ignoreEncryption: true });
            if (lhDoc.getPageCount() > 0) {
              const [embeddedLh] = await pdfDoc.embedPdf(lhDoc, [0]);
              firstPage.drawPage(embeddedLh, {
                x: 0,
                y: 0,
                width,
                height,
                opacity: 1
              });
            }
          } catch (pdfLhErr) {
            console.warn('Could not overlay letterhead PDF:', pdfLhErr);
          }
        }
      }
    } catch (lhErr) {
      console.warn('Could not overlay letterhead:', lhErr);
    }
  }

  const replacementDict = buildReplacementDictionary(data, mappings);
  const targetSignature = signatureDataUrl || data?.signatureImage || data?.signatureUrl || data?.mtSignatureUrl || data?.signature;

  // 1. Fill AcroForm fields
  try {
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    fields.forEach(field => {
      const fieldName = field.getName();
      const bareName = fieldName.replace(/[{}]/g, '').trim();

      // Check direct match, bare match, or mapped system key
      let valueToSet = replacementDict[fieldName] ?? replacementDict[bareName] ?? replacementDict[`{{${bareName}}}`];

      if (valueToSet === undefined && mappings && mappings[fieldName]) {
        valueToSet = replacementDict[mappings[fieldName]];
      }

      if (valueToSet !== undefined) {
        try {
          const textField = form.getTextField(fieldName);
          if (textField) {
            textField.setText(String(valueToSet));
          }
        } catch {
          // Field might not be textfield
        }
      }
    });

    // Flatten form so it renders consistently across all PDF readers
    try {
      form.flatten();
    } catch {
      // Ignore if flattening unsupported
    }
  } catch {
    // PDF might not have AcroForm
  }

  // 2. Perform search-and-replace on page content streams
  const pageCount = pdfDoc.getPageCount();
  for (let pageIdx = 0; pageIdx < pageCount; pageIdx++) {
    const page = pdfDoc.getPage(pageIdx);
    const contents = page.node.Contents();
    if (!contents) continue;

    const streamRefs = (contents as any).asArray
      ? Array.from({ length: (contents as any).size() }, (_, i) => (contents as any).get(i))
      : [contents];

    for (const ref of streamRefs) {
      try {
        const streamObj = pdfDoc.context.lookup(ref) as any;
        if (!streamObj || typeof streamObj.getContents !== 'function') continue;

        const rawBytes: Uint8Array = streamObj.getContents();
        let isCompressed = false;
        let decodedText = '';

        try {
          decodedText = new TextDecoder('utf-8', { fatal: false }).decode(pako.inflate(rawBytes));
          isCompressed = true;
        } catch {
          decodedText = new TextDecoder('utf-8', { fatal: false }).decode(rawBytes);
          isCompressed = false;
        }

        let modified = false;

        // Perform token replacement in decoded stream
        for (const [token, value] of Object.entries(replacementDict)) {
          if (!token) continue;
          const cleanToken = token.trim();
          const cleanValue = String(value);

          // 1. Literal replacement in ( ... )
          if (decodedText.includes(cleanToken)) {
            const safePdfVal = cleanValue.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
            decodedText = decodedText.split(cleanToken).join(safePdfVal);
            modified = true;
          }

          // 2. Hex replacement in < ... >
          const tokenHex = textToHex(cleanToken);
          if (decodedText.toUpperCase().includes(tokenHex)) {
            const valHex = textToHex(cleanValue);
            const hexRegex = new RegExp(tokenHex, 'gi');
            decodedText = decodedText.replace(hexRegex, valHex);
            modified = true;
          }
        }

        if (modified) {
          const newBytes = new TextEncoder().encode(decodedText);
          const finalBytes = isCompressed ? pako.deflate(newBytes) : newBytes;
          const newStream = PDFRawStream.of(streamObj.dict, finalBytes);
          pdfDoc.context.assign(ref, newStream);
        }
      } catch (streamErr) {
        console.warn('Error replacing in PDF stream:', streamErr);
      }
    }
  }

  // 3. Inject signature image/pdf into AcroForm signature field or draw on signature area
  if (targetSignature && typeof targetSignature === 'string' && (targetSignature.startsWith('data:image') || targetSignature.startsWith('data:application/pdf'))) {
    try {
      const base64Data = targetSignature.split(',')[1];
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      
      let embeddedVisual: any = null;
      let isPdfEmbed = false;
      
      if (targetSignature.startsWith('data:application/pdf')) {
        const [embeddedPdf] = await pdfDoc.embedPdf(bytes);
        embeddedVisual = embeddedPdf;
        isPdfEmbed = true;
      } else {
        embeddedVisual = targetSignature.includes('image/jpeg') || targetSignature.includes('image/jpg')
          ? await pdfDoc.embedJpg(bytes)
          : await pdfDoc.embedPng(bytes);
      }

      let placedInForm = false;
      try {
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        for (const field of fields) {
          const name = field.getName().toLowerCase();
          if (name.includes('sign') || name.includes('ttd') || name.includes('paraf')) {
            try {
              const btn = form.getButton(field.getName());
              if (!isPdfEmbed) {
                btn.setImage(embeddedVisual);
                placedInForm = true;
              }
            } catch {
              // Not a button field
            }
          }
        }
      } catch {
        // No acroform
      }

      // Draw onto the signature area of the last page if not set in an AcroForm field
      if (!placedInForm) {
        const pages = pdfDoc.getPages();
        if (pages.length > 0) {
          const lastPage = pages[pages.length - 1];
          const { width } = lastPage.getSize();
          
          if (isPdfEmbed) {
             const { width: pdW, height: pdH } = embeddedVisual.scale(1);
             const scale = Math.min(125 / pdW, 55 / pdH);
             lastPage.drawPage(embeddedVisual, {
               x: width - 210,
               y: 90,
               xScale: scale,
               yScale: scale,
               opacity: 0.95
             });
          } else {
            const sigW = 125;
            const sigH = (embeddedVisual.height / embeddedVisual.width) * sigW;
            lastPage.drawImage(embeddedVisual, {
              x: width - 210,
              y: 90,
              width: sigW,
              height: Math.min(sigH, 55),
              opacity: 0.95
            });
          }
        }
      }
    } catch (sigErr) {
      console.warn('Could not embed digital signature into PDF:', sigErr);
    }
  }

  return await pdfDoc.save();
}

/**
 * Generates filled DOCX from template and mappings
 */
export async function generateFromDocxTemplateBytes(
  arrayBuffer: ArrayBuffer,
  data: any,
  mappings?: Record<string, string>
): Promise<Blob> {
  const zip = new PizZip(arrayBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // Enrich data with mapped keys
  const enrichedData = { ...data };
  if (mappings) {
    for (const [token, systemKey] of Object.entries(mappings)) {
      const bareToken = token.replace(/[{}]/g, '').trim();
      if (data[systemKey] !== undefined) {
        enrichedData[bareToken] = data[systemKey];
        enrichedData[token] = data[systemKey];
      }
    }
  }

  doc.render(enrichedData);

  return doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * Returns document bytes for live previewing or downloading
 * Supports: PDF, Word (.docx), and Excel (.xlsx -> PDF or filled XLSX)
 */
export async function generateDocumentBytes(
  templateUrl: string,
  data: any,
  mappings?: Record<string, string>,
  signatureDataUrl?: string,
  letterheadUrl?: string | null,
  fileTypeHint?: 'pdf' | 'docx' | 'xlsx'
): Promise<{ 
  blob: Blob; 
  url: string; 
  extension: 'pdf' | 'docx' | 'xlsx';
  excelUrl?: string;
  pdfUrl?: string;
  isGoogleDriveLink?: boolean;
  googleDriveFileId?: string;
}> {
  if (!templateUrl) {
    const pdfBytes = await createCleanDefaultPdf(data, mappings, signatureDataUrl, letterheadUrl);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    return { 
      blob, 
      url, 
      extension: 'pdf' 
    };
  }

  const gdriveId = extractGoogleDriveFileId(templateUrl);
  const isGdrive = !!gdriveId || templateUrl.includes('drive.google.com') || templateUrl.includes('docs.google.com');

  try {
    const arrayBuffer = await fetchFile(templateUrl);
    const lowerUrl = templateUrl.toLowerCase();
    const isDocx = fileTypeHint === 'docx' || lowerUrl.includes('.docx');
    const isExcel = fileTypeHint === 'xlsx' || lowerUrl.includes('.xlsx') || lowerUrl.includes('.xls') || lowerUrl.includes('spreadsheet');

    if (isDocx) {
      const blob = await generateFromDocxTemplateBytes(arrayBuffer, data, mappings);
      const url = URL.createObjectURL(blob);
      return { blob, url, extension: 'docx', isGoogleDriveLink: isGdrive, googleDriveFileId: gdriveId || undefined };
    } else if (isExcel) {
      // Fill Excel template data
      const filledExcelBuffer = fillExcelTemplate(arrayBuffer, data, mappings);
      const excelBlob = new Blob([filledExcelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const excelDownloadUrl = URL.createObjectURL(excelBlob);

      let pdfDownloadUrl: string | undefined = undefined;
      try {
        const pdfBytes = await convertExcelToPdfBytes(
          filledExcelBuffer, 
          letterheadUrl, 
          data.subject || data.hospitalName || 'DOKUMEN BERITA ACARA'
        );
        const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        pdfDownloadUrl = URL.createObjectURL(pdfBlob);
      } catch (pdfErr) {
        console.warn('Could not generate PDF from Excel for preview:', pdfErr);
      }

      return { 
        blob: excelBlob, 
        url: pdfDownloadUrl || excelDownloadUrl, 
        excelUrl: excelDownloadUrl,
        pdfUrl: pdfDownloadUrl,
        extension: 'xlsx', 
        isGoogleDriveLink: isGdrive, 
        googleDriveFileId: gdriveId || undefined 
      };
    } else {
      // PDF Template (with optional Kop Surat letterhead background)
      const pdfBytes = await searchAndReplaceInPdf(arrayBuffer, data, mappings, signatureDataUrl, letterheadUrl);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      return { blob, url, extension: 'pdf', isGoogleDriveLink: isGdrive, googleDriveFileId: gdriveId || undefined };
    }
  } catch (err: any) {
    console.warn('Could not process template directly from URL, fallback to clean PDF generator:', err);
    // Automatic fallback for Google Drive URLs, CORS errors, or HTML pages
    const pdfBytes = await createCleanDefaultPdf(data, mappings, signatureDataUrl, letterheadUrl);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    return { 
      blob, 
      url, 
      extension: 'pdf', 
      isGoogleDriveLink: true, 
      googleDriveFileId: gdriveId || undefined 
    };
  }
}

/**
 * Main unified document generation and download function
 */
export async function generateDocument(
  templateUrl: string,
  data: any,
  outputFilename: string,
  mappings?: Record<string, string>,
  signatureDataUrl?: string,
  letterheadUrl?: string | null,
  fileTypeHint?: 'pdf' | 'docx' | 'xlsx'
) {
  const { blob, extension } = await generateDocumentBytes(templateUrl, data, mappings, signatureDataUrl, letterheadUrl, fileTypeHint);
  saveAs(blob, `${outputFilename}.${extension}`);
}
