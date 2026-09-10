import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  X, 
  Download, 
  FileText, 
  CheckCircle2, 
  Building2, 
  Calendar, 
  Sparkles, 
  Phone, 
  Mail, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Calculator,
  ArrowRight,
  Wand2,
  PenTool
} from 'lucide-react';
import { SignaturePadModal } from './SignaturePadModal';
import { SphQuotation } from '../types';
import { CompanyLogo } from './CompanyLogo';
import { OfficialLetterhead } from './OfficialLetterhead';
import { OfficialLetterFooter } from './OfficialLetterFooter';
import { formatRupiah, formatNumber } from '../utils/sphHelpers';
import { exportSphToWord } from '../utils/sphWordExport';
import { generateDocument } from '../lib/templateGenerator';
import { getFullTemplatesConfig, DocumentTemplatesConfig } from '../lib/templateService';

interface SphPrintModalProps {
  sph: SphQuotation;
  isOpen: boolean;
  onClose: () => void;
  onConvertToSpk?: (sph: SphQuotation) => void;
}

export const SphPrintModal: React.FC<SphPrintModalProps> = ({
  sph,
  isOpen,
  onClose,
  onConvertToSpk
}) => {
  const [activeViewTab, setActiveViewTab] = useState<'all' | 'page1' | 'page2'>('all');
  const [templatesConfig, setTemplatesConfig] = useState<DocumentTemplatesConfig | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Digital Signature state
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [digitalSignatureUrl, setDigitalSignatureUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem('smk_last_signature');
    } catch {
      return null;
    }
  });

  const handleSaveSignature = (sigUrl: string) => {
    setDigitalSignatureUrl(sigUrl);
  };

  useEffect(() => {
    if (isOpen) {
      getFullTemplatesConfig().then(setTemplatesConfig).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Split items across pages (30 items per page for standard A4 matching official SPH layout)
  const itemsPerPage = 30;
  const itemChunks: typeof sph.items[] = [];
  for (let i = 0; i < sph.items.length; i += itemsPerPage) {
    itemChunks.push(sph.items.slice(i, i + itemsPerPage));
  }
  if (itemChunks.length === 0) itemChunks.push([]);

  // Calculate total units
  const totalUnits = sph.items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);

  // Format date Indonesian
  const formattedDate = new Date(sph.date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const handleGenerateTemplate = async () => {
    const sphConfig = templatesConfig?.sph;
    if (!sphConfig?.activeUrl) {
      alert('Anda belum mengunggah template SPH. Silakan unggah di menu Pengaturan Template.');
      return;
    }

    setIsGenerating(true);
    try {
      const data = {
        sphNumber: sph.sphNumber,
        subject: sph.subject || 'Surat Penawaran Harga Kalibrasi',
        date: formattedDate,
        city: sph.city || 'Surakarta',
        recipientRole: sph.recipientRole || 'Direktur',
        hospitalName: sph.hospitalName,
        hospitalAddress: sph.hospitalAddress,
        marketingStaffName: sph.marketingStaffName,
        marketingStaffPhone: sph.marketingStaffPhone,
        directorName: sph.directorName || 'Ahmad Fajar Ariyanto',
        directorTitle: sph.directorTitle || 'Direktur',
        subtotal1: formatNumber(sph.subtotal1),
        ppnAmount: formatNumber(sph.ppnAmount),
        subtotal2: formatNumber(sph.subtotal2 || (sph.subtotal1 + sph.ppnAmount)),
        accommodationFee: formatNumber(sph.accommodationFee),
        grandTotal: formatNumber(sph.grandTotal),
        terbilang: sph.terbilang || 'Nol Rupiah',
        items: sph.items.map((it, i) => ({
          no: i + 1,
          description: it.description,
          notes: it.notes || '',
          quantity: it.quantity,
          unit: it.unit || 'Unit',
          unitPrice: formatNumber(it.unitPrice),
          totalPrice: formatNumber(it.totalPrice)
        }))
      };

      await generateDocument(
        sphConfig.activeUrl, 
        data, 
        `SPH_${sph.hospitalName}`, 
        sphConfig.mappings,
        digitalSignatureUrl || undefined,
        templatesConfig?.kop_surat?.activeUrl || null
      );
    } catch (error) {
      console.error(error);
      alert('Gagal menghasilkan dokumen dari template.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white border border-[#D8D2CB] rounded-2xl w-full max-w-5xl my-4 overflow-hidden shadow-2xl flex flex-col print:bg-white print:border-none print:shadow-none print:my-0 print:max-w-none">
        
        {/* Modal Top Control Bar (Hidden on Print) */}
        <div className="px-6 py-4 bg-[#EEEEEE] border-b border-[#D8D2CB] flex flex-wrap items-center justify-between gap-3 print:hidden sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1C658C]/10 border border-[#1C658C]/20 rounded-xl text-[#1C658C]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#1C658C] text-base">Surat Penawaran Harga (SPH) Resmi</h3>
                <span className="bg-white text-[#1C658C] border border-[#D8D2CB] text-xs px-2 py-0.5 rounded font-mono font-bold">
                  {sph.sphNumber}
                </span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  sph.status === 'Disetujui (Deal)' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                  sph.status === 'Negosiasi' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                  'bg-slate-200 text-slate-700 border border-slate-300'
                }`}>
                  {sph.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Format Standar Dokumen Kemenkes RI No. 26062301565850001 • {sph.hospitalName}
              </p>
            </div>
          </div>

          {/* Quick Page Selector Tabs */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-[#D8D2CB] text-xs">
            <button
              onClick={() => setActiveViewTab('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeViewTab === 'all' ? 'bg-[#1C658C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Halaman (1 & 2)
            </button>
            <button
              onClick={() => setActiveViewTab('page1')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeViewTab === 'page1' ? 'bg-[#1C658C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hal 1: Surat Pengantar
            </button>
            <button
              onClick={() => setActiveViewTab('page2')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeViewTab === 'page2' ? 'bg-[#1C658C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hal 2: Lampiran Harga ({sph.items.length} Alat)
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSignatureModal(true)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border shadow-xs ${
                digitalSignatureUrl 
                  ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-[#D8D2CB]'
              }`}
              title="Bubuhkan atau ganti tanda tangan digital resmi"
            >
              <PenTool className="w-4 h-4 text-[#1C658C]" />
              <span>{digitalSignatureUrl ? 'Ubah TTD Digital' : 'Tanda Tangan'}</span>
              {digitalSignatureUrl && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>

            <button
              onClick={handleGenerateTemplate}
              disabled={isGenerating}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {isGenerating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              <span>Generate dari Template</span>
            </button>

            {onConvertToSpk && (
              <button
                onClick={() => onConvertToSpk(sph)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
                title="Konversi penawaran deal ini menjadi Surat Perintah Kerja (SPK)"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Buat SPK dari SPH</span>
              </button>
            )}

            <button
              onClick={() => exportSphToWord(sph)}
              className="px-3.5 py-2 bg-[#398AB9] hover:bg-[#1C658C] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
              title="Download format Word (.doc) yang dapat diedit langsung"
            >
              <Download className="w-4 h-4" />
              <span>Word (.doc)</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#1C658C] hover:bg-[#398AB9] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shadow-xs active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF (A4)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="p-4 sm:p-8 bg-[#EEEEEE]/60 overflow-y-auto space-y-8 print:p-0 print:space-y-0 print:bg-white text-slate-900">
          
          {/* ========================================================================= */}
          {/* HALAMAN 1: SURAT PENGANTAR RESMI SPH                                      */}
          {/* ========================================================================= */}
          {(activeViewTab === 'all' || activeViewTab === 'page1') && (
            <div className={`bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-xl max-w-[210mm] mx-auto min-h-[297mm] relative overflow-hidden flex flex-col justify-between print:shadow-none print:rounded-none print:p-0 print:m-0 print:w-full print:min-h-0 print-page-clean ${activeViewTab === 'all' ? 'print-break-after' : 'print-no-break-after'}`}>
              
              {/* KOP SURAT RESMI PT SARANA MULTI KALIBRASI */}
              <div>
                <OfficialLetterhead className="mb-4" />

                {/* Surat Meta (Nomor, Perihal, Tanggal, Kepada) */}
                <div className="flex justify-between items-start mb-4 text-xs sm:text-[13px] leading-relaxed">
                  {/* Sisi Kiri: Nomor, Perihal, Lampiran */}
                  <div className="space-y-0.5">
                    <div className="grid grid-cols-[75px_12px_1fr]">
                      <span className="font-semibold text-slate-900">Nomor</span>
                      <span>:</span>
                      <span className="font-bold text-slate-950">{sph.sphNumber}</span>
                    </div>
                    <div className="grid grid-cols-[75px_12px_1fr]">
                      <span className="font-semibold text-slate-900">Perihal</span>
                      <span>:</span>
                      <span className="font-semibold text-slate-900">{sph.subject || 'Surat Penawaran Harga Kalibrasi'}</span>
                    </div>
                    <div className="grid grid-cols-[75px_12px_1fr]">
                      <span className="font-semibold text-slate-900">Lampiran</span>
                      <span>:</span>
                      <span className="text-slate-800">{sph.attachmentPages || `${itemChunks.length} Lembar`}</span>
                    </div>
                  </div>

                  {/* Sisi Kanan: Tempat & Tanggal */}
                  <div className="text-right text-xs sm:text-[13px] font-medium text-slate-900">
                    {sph.city || 'Surakarta'}, {formattedDate}
                  </div>
                </div>

                {/* Tujuan Surat (Kepada Yth) */}
                <div className="mb-4 text-xs sm:text-[13px] space-y-0.5">
                  <p className="text-slate-900 font-medium">Kepada Yth:</p>
                  <p className="font-bold text-slate-950">{sph.recipientRole || 'Direktur'}</p>
                  <p className="font-bold text-slate-950">{sph.hospitalName}</p>
                  <p className="text-slate-800 max-w-xl leading-relaxed text-xs">
                    {sph.hospitalAddress}
                  </p>
                </div>

                {/* Isi Surat Pengantar */}
                <div className="space-y-2.5 text-xs sm:text-[12.5px] leading-relaxed text-slate-900 text-justify mb-4">
                  <p className="font-medium">Dengan Hormat,</p>
                  <p>
                    Menindaklanjuti mengenai permintaan Kalibrasi alat Kesehatan, <strong>PT. Sarana Multi Kalibrasi</strong> telah memiliki izin dari Kementrian Kesehatan dengan No. 26062301565850001, Sertifikat Akreditasi KAN LK-532-IDN serta menerapkan Standar SNI ISO/ IEC 17025: 2017, melampirkan harga penawaran, adapun ketentuan yang berlaku sebagai berikut:
                  </p>

                  {/* 9 Poin Ketentuan Resmi */}
                  <ol className="list-decimal list-outside ml-5 space-y-1 text-slate-900 text-xs sm:text-[12px]">
                    <li>{sph.isPpnIncluded ? 'Harga sudah termasuk PPN 11%.' : 'Harga belum termasuk PPN 11%.'}</li>
                    <li>Harga sudah termasuk biaya transportasi dan akomodasi.</li>
                    <li>Harga tidak termasuk service dan maintenance.</li>
                    <li>Penawaran berlaku 1 bulan, sejak tanggal penawaran diterbitkan.</li>
                    <li>Selama pekerjaan (on site) teknisi kami wajib didampingi oleh petugas atau staff setempat dalam proses kalibrasi.</li>
                    <li>Apabila terdapat penambahan alat pada saat kalibrasi, segera dimutakhirkan BO (Bukti Order) dan di setujui pelanggan.</li>
                    <li>Pekerjaan dianggap selesai setelah berita acara/BO (Bukti Order) di tanda tangani oleh pihak yang berwenang.</li>
                    <li>Kalibrasi di atas termasuk sertifikat kalibrasi yang dikeluarkan oleh PT. Sarana Multi Kalibrasi.</li>
                    <li>
                      <div>Pembayaran : {sph.bankName || 'Bank Mandiri Cab. Surakarta'}</div>
                      <div className="pl-0 sm:pl-[78px]">No. Rek : {sph.bankAccountNumber || '138-00-2610846-9'} ({sph.bankAccountName || 'SARANA MULTI KALIBRASI PT'})</div>
                    </li>
                  </ol>

                  <p className="pt-1">
                    Bersama ini kami bermaksud mengajukan permohonan persetujuan Surat Penawaran Harga.
                  </p>
                  <p>
                    Untuk informasi lebih lanjut dapat menghubungi marketing kami di : <strong>{sph.marketingStaffPhone || '0821-3670-7421'} ({sph.marketingStaffName || 'Sulis'})</strong>. Demikian, atas perhatian dan kerjasamanya kami ucapkan terimakasih.
                  </p>
                </div>

                {/* Area Tanda Tangan */}
                <div className="grid grid-cols-2 gap-8 pt-2 pb-2 text-xs sm:text-sm">
                  {/* Pihak SMK */}
                  <div className="text-left">
                    <p className="font-bold text-slate-950">PT. SARANA MULTI KALIBRASI</p>
                    
                    {/* TTD & Stempel Box */}
                    <div className="h-24 flex items-center justify-start relative my-1">
                      {/* Authentic SMK Logo Stamp */}
                      <div className="opacity-80 scale-90 -ml-2">
                        <CompanyLogo size="lg" variant="light" showSubtitle={false} />
                      </div>
                      {/* Authentic Signature overlay */}
                      {digitalSignatureUrl ? (
                        <img 
                          src={digitalSignatureUrl} 
                          alt="Tanda Tangan Digital Direktur" 
                          className="absolute h-20 max-w-[180px] object-contain -left-2 z-10" 
                        />
                      ) : (
                        <svg className="absolute w-44 h-24 pointer-events-none -left-2" viewBox="0 0 200 100" fill="none">
                          <path d="M 20 60 Q 40 10, 60 70 T 90 30 Q 110 80, 130 40 L 160 55 M 30 50 L 170 45" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                        </svg>
                      )}
                    </div>

                    <p className="font-bold text-slate-950 underline underline-offset-2">
                      {sph.directorName || 'Ahmad Fajar Ariyanto'}
                    </p>
                    <p className="text-xs text-slate-800 font-semibold">{sph.directorTitle || 'Direktur'}</p>
                  </div>

                  {/* Pihak Pelanggan (Rumah Sakit) */}
                  <div className="text-left flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-slate-950">Disetujui oleh Pelanggan,</p>
                    </div>

                    <div className="h-24 flex items-center">
                    </div>

                    <div>
                      <p className="font-bold text-slate-950">
                        ( ………………………………… )
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Resmi PT SMK (Sesuai Layout SPH) */}
              <OfficialLetterFooter className="mt-4" />

            </div>
          )}

          {/* ========================================================================= */}
          {/* HALAMAN 2+: LAMPIRAN RINCIAN SURAT PENAWARAN HARGA (TABEL ALAT & HARGA)   */}
          {/* ========================================================================= */}
          {(activeViewTab === 'all' || activeViewTab === 'page2') && itemChunks.map((chunk, chunkIndex) => (
            <div 
              key={`chunk-${chunkIndex}`}
              className={`bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-xl max-w-[210mm] mx-auto min-h-[297mm] relative overflow-hidden flex flex-col justify-between print:shadow-none print:rounded-none print:p-0 print:m-0 print:w-full print:min-h-0 print-page-clean ${chunkIndex > 0 ? 'print-break-after' : ''} ${chunkIndex < itemChunks.length - 1 ? 'print-break-after' : 'print-no-break-after'}`}
            >
              <div>
                {/* KOP SURAT LAMPIRAN SPH */}
                <OfficialLetterhead className="mb-4" />

                {/* Header Meta SPH Lampiran */}
                <div className="flex justify-between items-start mb-2 text-xs sm:text-[13px] leading-relaxed">
                  <div className="space-y-0.5">
                    <div className="grid grid-cols-[75px_12px_1fr]">
                      <span className="font-semibold text-slate-900">Nomor</span>
                      <span>:</span>
                      <span className="font-bold text-slate-950">{sph.sphNumber}</span>
                    </div>
                    <div className="grid grid-cols-[75px_12px_1fr]">
                      <span className="font-semibold text-slate-900">Perihal</span>
                      <span>:</span>
                      <span className="font-semibold text-slate-900">{sph.subject || 'Surat Penawaran Harga Kalibrasi'}</span>
                    </div>
                    <div className="grid grid-cols-[75px_12px_1fr]">
                      <span className="font-semibold text-slate-900">Lampiran</span>
                      <span>:</span>
                      <span className="text-slate-800">{sph.attachmentPages || `${itemChunks.length} Lembar`}</span>
                    </div>
                  </div>
                  <div className="text-right text-xs sm:text-[13px] font-medium text-slate-900">
                    {sph.city || 'Surakarta'}, {formattedDate}
                  </div>
                </div>

                {/* Judul Dokumen Lampiran */}
                <div className="text-center my-2 pb-1">
                  <span className="text-sm sm:text-base font-bold text-slate-950 underline underline-offset-4 tracking-wide">
                    Surat Penawaran Harga
                  </span>
                </div>

                {/* Tabel Rincian Alat Medis */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-black text-xs">
                    <thead>
                      <tr className="bg-[#0099e6] text-white font-bold border-b border-black text-center">
                        <th className="border border-black px-2 py-1.5 w-10 text-center text-white">No.</th>
                        <th className="border border-black px-3 py-1.5 text-center text-white">Diskripsi</th>
                        <th className="border border-black px-2 py-1.5 w-12 text-center text-white">Qty</th>
                        <th className="border border-black px-3 py-1.5 w-32 text-center text-white">Harga Satuan</th>
                        <th className="border border-black px-3 py-1.5 w-36 text-center text-white">Total Harga</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chunk.map((item, index) => {
                        const globalIndex = (chunkIndex * itemsPerPage) + index + 1;
                        return (
                          <tr key={item.id || index} className="hover:bg-slate-50">
                            <td className="border border-black px-2 py-1 text-center font-medium">
                              {globalIndex}
                            </td>
                            <td className="border border-black px-3 py-1">
                              <span className="font-semibold text-slate-900">{item.description}</span>
                              {item.notes && (
                                <span className="block text-[10px] text-slate-500 italic leading-tight">
                                  {item.notes}
                                </span>
                              )}
                            </td>
                            <td className="border border-black px-2 py-1 text-center font-medium">
                              {item.quantity}
                            </td>
                            <td className="border border-black px-2 py-1 text-slate-900">
                              <div className="flex justify-between items-center">
                                <span>Rp</span>
                                <span className="font-mono">{formatNumber(item.unitPrice)}</span>
                              </div>
                            </td>
                            <td className="border border-black px-2 py-1 font-semibold text-slate-950">
                              <div className="flex justify-between items-center">
                                <span>Rp</span>
                                <span className="font-mono">{formatNumber(item.totalPrice)}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Jika ini chunk terakhir, tampilkan baris Total dan Ringkasan */}
                    {chunkIndex === itemChunks.length - 1 && (
                      <tfoot>
                        {/* Jumlah Unit Total */}
                        <tr className="font-bold border-t border-black bg-white">
                          <td colSpan={2} className="border border-black px-3 py-1 text-center font-bold">
                            Jumlah
                          </td>
                          <td className="border border-black px-2 py-1 text-center font-bold">
                            {totalUnits}
                          </td>
                          <td className="border border-black px-3 py-1 text-right font-bold">
                            Total 1
                          </td>
                          <td className="border border-black px-2.5 py-1 font-mono font-bold text-slate-950">
                            <div className="flex justify-between items-center">
                              <span>Rp</span>
                              <span>{formatNumber(sph.subtotal1)}</span>
                            </div>
                          </td>
                        </tr>

                        {/* Terbilang (Spans 3 cols, 4 rows) + PPN 11% */}
                        <tr className="border-t border-black bg-white">
                          <td colSpan={3} rowSpan={4} className="border border-black p-0 align-top bg-white">
                            <div className="h-full min-h-[90px] flex flex-col justify-between">
                              <div className="bg-[#0099e6] text-white font-bold px-2 py-1 text-xs">
                                Terbilang:
                              </div>
                              <div className="flex-1 flex items-center justify-center p-3 text-center">
                                <span className="font-bold italic text-slate-950 text-xs sm:text-sm">
                                  "{sph.terbilang || 'Nol Rupiah'}"
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="border border-black px-3 py-1 text-right font-bold text-slate-900">
                            PPN 11%
                          </td>
                          <td className="border border-black px-2.5 py-1 font-mono font-semibold text-slate-900">
                            <div className="flex justify-between items-center">
                              <span>Rp</span>
                              <span>{formatNumber(sph.ppnAmount)}</span>
                            </div>
                          </td>
                        </tr>

                        {/* Total 2 */}
                        <tr className="border-t border-black bg-white">
                          <td className="border border-black px-3 py-1 text-right font-bold text-slate-900">
                            Total 2
                          </td>
                          <td className="border border-black px-2.5 py-1 font-mono font-semibold text-slate-900">
                            <div className="flex justify-between items-center">
                              <span>Rp</span>
                              <span>{formatNumber(sph.subtotal2 || (sph.subtotal1 + sph.ppnAmount))}</span>
                            </div>
                          </td>
                        </tr>

                        {/* Akomodasi */}
                        <tr className="border-t border-black bg-white">
                          <td className="border border-black px-3 py-1 text-right font-bold text-slate-900">
                            Akomodasi
                          </td>
                          <td className="border border-black px-2.5 py-1 font-mono font-semibold text-slate-900">
                            <div className="flex justify-between items-center">
                              <span>Rp</span>
                              <span>{sph.accommodationFee > 0 ? formatNumber(sph.accommodationFee) : '-'}</span>
                            </div>
                          </td>
                        </tr>

                        {/* GRAND TOTAL */}
                        <tr className="bg-[#0099e6] text-white font-bold border-t border-black">
                          <td className="border border-black px-3 py-1.5 text-right font-bold text-white uppercase text-xs sm:text-sm">
                            GRAND TOTAL
                          </td>
                          <td className="border border-black px-2.5 py-1.5 font-mono font-black text-white text-xs sm:text-sm">
                            <div className="flex justify-between items-center">
                              <span>Rp</span>
                              <span>{formatNumber(sph.grandTotal)}</span>
                            </div>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Terbilang & Catatan Kaki (Hanya di chunk terakhir) */}
                {chunkIndex === itemChunks.length - 1 && (
                  <div className="mt-3 text-[10px] sm:text-[10.5px] text-slate-700 italic space-y-0.5 pt-1">
                    <p>*Hanya dilakukan Uji Keselamatan Listrik dan/atau Uji Fungsi dan Kondisi Alat</p>
                    <p>**Alat dilakukan penarikan ke PT Sarana Multi Kalibrasi</p>
                    <p>***Alat dilakukan penarikan untuk subkontraktor pekerjaan</p>
                    <p>****Tidak termasuk jenis alat wajib kalibrasi</p>
                  </div>
                )}
              </div>

              {/* Footer Resmi PT SMK (Sesuai Layout SPH) */}
              <OfficialLetterFooter className="mt-6" />

            </div>
          ))}

        </div>

      </div>

      {/* Authorized Digital Signature Pad Modal */}
      <SignaturePadModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSaveSignature={handleSaveSignature}
        initialSignerName={sph.directorName || 'Ahmad Fajar Ariyanto'}
        initialSignerRole={sph.directorTitle || 'Direktur PT. Sarana Multi Kalibrasi'}
        title="Bubuhkan Tanda Tangan Digital Direktur (SPH)"
      />
    </div>
  );
};
