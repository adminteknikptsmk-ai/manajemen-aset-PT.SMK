import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { BapDocument, BapItem } from '../types';

/**
 * Convert 0-indexed column number to Excel letter (e.g. 0 -> A, 1 -> B, 26 -> AA)
 */
function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

interface BuildWorksheetOptions {
  isBap: boolean;
  isNonPo: boolean;
}

/**
 * Builds a single BAP worksheet matching the official reference format:
 * Row 1..7: Header (Nama RS., No. PO, Tanggal PO, Alamat, Kota/Kab., No. Label, No. BASTP)
 * Row 8: Blank
 * Row 9..10: Table Header (No., NAMA ALAT, PO, REALISASI [Tgl...], TOTAL, SISA, KETERANGAN)
 * Row 11+: Item rows
 * Last table row: JUMLAH
 * Signature block: Di Isi Oleh Teknisi Lapangan & Di Isi Oleh Admin
 */
function buildBapWorksheet(bap: BapDocument, items: BapItem[], options: BuildWorksheetOptions): XLSX.WorkSheet {
  const dateCols = bap.dateColumns && bap.dateColumns.length > 0 
    ? bap.dateColumns 
    : ['Tgl 03', 'Tgl 04', 'Tgl 05'];
  const numDates = dateCols.length;

  // AOA (Array of Arrays) representation
  const aoa: any[][] = [];

  // Row 0..6: Header block (Starting at Column B / index 1, Col D / index 3 for ':', Col E / index 4 for Value)
  aoa.push(['', 'Nama RS.', '', ':', bap.customerName || '']);
  aoa.push(['', 'No. PO', '', ':', bap.sphNumber || '']);
  aoa.push(['', 'Tanggal PO', '', ':', bap.poDate || '']);
  aoa.push(['', 'Alamat', '', ':', bap.address || '']);
  aoa.push(['', 'Kota/Kab.', '', ':', bap.cityDistrict || '']);
  aoa.push(['', 'No. Label', '', ':', bap.labelNumber || '']);
  aoa.push(['', 'No. BASTP', '', ':', bap.bastpNumber || '']);

  // Row 7: Blank
  aoa.push([]);

  // Header indices:
  // Col 0: ''
  // Col 1: 'No.'
  // Col 2: 'NAMA ALAT'
  // Col 3: 'PO'
  // Col 4 .. 4 + numDates - 1: 'REALISASI'
  // Col 4 + numDates: 'TOTAL'
  // Col 4 + numDates + 1: 'SISA'
  // Col 4 + numDates + 2: 'KETERANGAN'

  const headerRow1: any[] = ['', 'No.', 'NAMA ALAT', 'PO', 'REALISASI'];
  for (let i = 1; i < numDates; i++) {
    headerRow1.push(''); // placeholder for merge
  }
  headerRow1.push('TOTAL', 'SISA', 'KETERANGAN');
  aoa.push(headerRow1); // row 8

  const headerRow2: any[] = ['', '', '', ''];
  for (let i = 0; i < numDates; i++) {
    headerRow2.push(dateCols[i]);
  }
  headerRow2.push('', '', '');
  aoa.push(headerRow2); // row 9

  // Table items start at row index 10 (1-indexed row 11 in Excel)
  const dataStartRow = 10;
  const effectiveItems = items.length > 0 
    ? items 
    : (options.isNonPo 
        ? [] // keep empty for Non PO template if no items added yet
        : []);

  let rowCounter = 0;
  if (effectiveItems.length > 0) {
    for (const item of effectiveItems) {
      rowCounter++;
      const itemRow: any[] = [
        '',
        item.no || rowCounter,
        item.namaAlat || '',
        Number(item.poQty) || 0
      ];

      let sumReal = 0;
      for (const dCol of dateCols) {
        const val = Number(item.realisasi?.[dCol]) || 0;
        itemRow.push(val > 0 ? val : '');
        sumReal += val;
      }

      const totalVal = Number(item.total) || sumReal;
      const sisaVal = (Number(item.poQty) || 0) - totalVal;

      itemRow.push(totalVal, sisaVal, item.keterangan || '');
      aoa.push(itemRow);
    }
  } else if (options.isNonPo) {
    // Leave 2 clean blank template rows for manual field recording in Non PO
    for (let k = 1; k <= 2; k++) {
      const templateRow: any[] = ['', k, '', 0];
      for (let i = 0; i < numDates; i++) {
        templateRow.push('');
      }
      templateRow.push(0, 0, '');
      aoa.push(templateRow);
    }
    rowCounter = 2;
  }

  // Row JUMLAH
  const jumlahRowIdx = aoa.length; // 0-indexed
  const jumlahRow: any[] = ['', 'JUMLAH', '', 0];
  for (let i = 0; i < numDates; i++) {
    jumlahRow.push(0);
  }
  jumlahRow.push(0, 0, '');
  aoa.push(jumlahRow);

  // Blank rows before signatures
  aoa.push([]);
  aoa.push(['', '', 'Di Isi Oleh Teknisi Lapangan']);
  aoa.push(['', '', 'Di Isi Oleh Admin']);

  // Convert AOA to Sheet
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Merges setup
  const merges: XLSX.Range[] = [
    // Header Row Merges (Rows 8 and 9)
    { s: { r: 8, c: 1 }, e: { r: 9, c: 1 } }, // No.
    { s: { r: 8, c: 2 }, e: { r: 9, c: 2 } }, // NAMA ALAT
    { s: { r: 8, c: 3 }, e: { r: 9, c: 3 } }, // PO
    { s: { r: 8, c: 4 }, e: { r: 8, c: 4 + numDates - 1 } }, // REALISASI spanning over dates
    { s: { r: 8, c: 4 + numDates }, e: { r: 9, c: 4 + numDates } }, // TOTAL
    { s: { r: 8, c: 4 + numDates + 1 }, e: { r: 9, c: 4 + numDates + 1 } }, // SISA
    { s: { r: 8, c: 4 + numDates + 2 }, e: { r: 9, c: 4 + numDates + 2 } }, // KETERANGAN
    // JUMLAH row merge (Col 1 to Col 2)
    { s: { r: jumlahRowIdx, c: 1 }, e: { r: jumlahRowIdx, c: 2 } }
  ];

  ws['!merges'] = merges;

  // Set column widths
  const cols: XLSX.ColInfo[] = [
    { wch: 3 },   // Col A (padding)
    { wch: 6 },   // Col B: No.
    { wch: 40 },  // Col C: NAMA ALAT
    { wch: 8 },   // Col D: PO
  ];
  for (let i = 0; i < numDates; i++) {
    cols.push({ wch: 9 }); // Realisasi date columns
  }
  cols.push({ wch: 9 });  // TOTAL
  cols.push({ wch: 8 });  // SISA
  cols.push({ wch: 18 }); // KETERANGAN
  ws['!cols'] = cols;

  // Enhance cells with Excel Formulas and formatting
  const totalColIdx = 4 + numDates;
  const sisaColIdx = 4 + numDates + 1;
  const totalColLetter = getColumnLetter(totalColIdx);
  const sisaColLetter = getColumnLetter(sisaColIdx);
  const poColLetter = 'D';

  const firstDataRowNumber = dataStartRow + 1; // 1-indexed (e.g. 11)
  const lastDataRowNumber = jumlahRowIdx;      // 1-indexed before JUMLAH row

  if (rowCounter > 0) {
    for (let r = dataStartRow; r < jumlahRowIdx; r++) {
      const rowNum = r + 1; // 1-indexed
      const firstDateColLetter = getColumnLetter(4);
      const lastDateColLetter = getColumnLetter(4 + numDates - 1);

      // Total formula cell: =SUM(E11:K11)
      const totalCellRef = `${totalColLetter}${rowNum}`;
      if (ws[totalCellRef]) {
        ws[totalCellRef].f = `SUM(${firstDateColLetter}${rowNum}:${lastDateColLetter}${rowNum})`;
      }

      // Sisa formula cell: =D11-L11
      const sisaCellRef = `${sisaColLetter}${rowNum}`;
      if (ws[sisaCellRef]) {
        ws[sisaCellRef].f = `${poColLetter}${rowNum}-${totalColLetter}${rowNum}`;
      }
    }

    // JUMLAH row formulas
    const jumlahRowNumber = jumlahRowIdx + 1;

    // PO Sum: =SUM(D11:D30)
    const poJumlahRef = `${poColLetter}${jumlahRowNumber}`;
    const poSum = effectiveItems.reduce((acc, it) => acc + (Number(it.poQty) || 0), 0);
    ws[poJumlahRef] = {
      t: 'n',
      v: poSum,
      f: `SUM(${poColLetter}${firstDataRowNumber}:${poColLetter}${lastDataRowNumber})`
    };

    // Date columns Sum: =SUM(E11:E30)
    for (let i = 0; i < numDates; i++) {
      const colLetter = getColumnLetter(4 + i);
      const cellRef = `${colLetter}${jumlahRowNumber}`;
      const dName = dateCols[i];
      const sumD = effectiveItems.reduce((acc, it) => acc + (Number(it.realisasi?.[dName]) || 0), 0);
      ws[cellRef] = {
        t: 'n',
        v: sumD,
        f: `SUM(${colLetter}${firstDataRowNumber}:${colLetter}${lastDataRowNumber})`
      };
    }

    // Total Sum: =SUM(L11:L30)
    const totalJumlahRef = `${totalColLetter}${jumlahRowNumber}`;
    const totalSum = effectiveItems.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
    ws[totalJumlahRef] = {
      t: 'n',
      v: totalSum,
      f: `SUM(${totalColLetter}${firstDataRowNumber}:${totalColLetter}${lastDataRowNumber})`
    };

    // SISA Sum: =SUM(M11:M30)
    const sisaJumlahRef = `${sisaColLetter}${jumlahRowNumber}`;
    const sisaSum = effectiveItems.reduce((acc, it) => acc + (Number(it.sisa) || 0), 0);
    ws[sisaJumlahRef] = {
      t: 'n',
      v: sisaSum,
      f: `SUM(${sisaColLetter}${firstDataRowNumber}:${sisaColLetter}${lastDataRowNumber})`
    };
  }

  return ws;
}

/**
 * Export 4-Sheet BAP document to Excel (.xlsx)
 * Sheets:
 * 1. Rekap
 * 2. BAP (mirrored from Rekap)
 * 3. Rekap Non PO
 * 4. BAP Non PO (mirrored from Rekap Non PO)
 */
export function exportBapToExcel(bap: BapDocument) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet "Rekap"
  const wsRekap = buildBapWorksheet(bap, bap.items, { isBap: false, isNonPo: false });
  XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekap');

  // 2. Sheet "BAP" (Synchronized mirror of Rekap)
  const wsBap = buildBapWorksheet(bap, bap.items, { isBap: true, isNonPo: false });
  XLSX.utils.book_append_sheet(wb, wsBap, 'BAP');

  // 3. Sheet "Rekap Non PO"
  const wsRekapNonPo = buildBapWorksheet(bap, bap.nonPoItems, { isBap: false, isNonPo: true });
  XLSX.utils.book_append_sheet(wb, wsRekapNonPo, 'Rekap Non PO');

  // 4. Sheet "BAP Non PO" (Synchronized mirror of Rekap Non PO)
  const wsBapNonPo = buildBapWorksheet(bap, bap.nonPoItems, { isBap: true, isNonPo: true });
  XLSX.utils.book_append_sheet(wb, wsBapNonPo, 'BAP Non PO');

  // Generate binary output
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

  // Safe filename
  const cleanCustomer = (bap.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanPo = (bap.sphNumber || 'BAP').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `BAP_${cleanCustomer}_${cleanPo}.xlsx`;

  saveAs(
    new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename
  );
}
