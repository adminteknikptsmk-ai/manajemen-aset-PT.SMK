import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { PDFDocument, PDFRawStream } from 'pdf-lib';
import pako from 'pako';

/**
 * Downloads a file as an array buffer.
 */
export async function fetchFile(url: string): Promise<ArrayBuffer> {
  if (url.startsWith('data:')) {
    const base64 = url.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch template: ${res.statusText}`);
  return await res.arrayBuffer();
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
 * Injects data into a PDF template using AcroForm filling and stream search-and-replace.
 */
export async function searchAndReplaceInPdf(
  arrayBuffer: ArrayBuffer,
  data: Record<string, any>,
  mappings?: Record<string, string>,
  signatureDataUrl?: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
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
            // Escape parentheses for PDF literal syntax
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
 */
export async function generateDocumentBytes(
  templateUrl: string,
  data: any,
  mappings?: Record<string, string>,
  signatureDataUrl?: string
): Promise<{ blob: Blob; url: string; extension: 'pdf' | 'docx' }> {
  const arrayBuffer = await fetchFile(templateUrl);
  const isDocx = templateUrl.toLowerCase().includes('.docx');

  if (isDocx) {
    const blob = await generateFromDocxTemplateBytes(arrayBuffer, data, mappings);
    const url = URL.createObjectURL(blob);
    return { blob, url, extension: 'docx' };
  } else {
    const pdfBytes = await searchAndReplaceInPdf(arrayBuffer, data, mappings, signatureDataUrl);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    return { blob, url, extension: 'pdf' };
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
  signatureDataUrl?: string
) {
  const { blob, extension } = await generateDocumentBytes(templateUrl, data, mappings, signatureDataUrl);
  saveAs(blob, `${outputFilename}.${extension}`);
}
