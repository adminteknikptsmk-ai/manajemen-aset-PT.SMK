import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Calculator, 
  Sparkles, 
  Building2, 
  Search, 
  Check, 
  FileText, 
  AlertCircle, 
  RotateCcw, 
  DollarSign, 
  Percent, 
  TrendingDown, 
  ArrowRight,
  HelpCircle,
  Receipt
} from 'lucide-react';
import { SphItem, SphQuotation, Hospital } from '../types';
import { SPH_TARIFF_CATALOG, TariffItem } from '../data/sphTariffCatalog';
import { calculateNegotiation, generateSphNumber, formatRupiah, formatNumber } from '../utils/sphHelpers';

import { PdfUploader } from './PdfUploader';

interface SphFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sph: SphQuotation) => void;
  hospitals: Hospital[];
  initialSph?: SphQuotation | null;
  existingSphCount?: number;
}

export const SphFormModal: React.FC<SphFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  hospitals,
  initialSph,
  existingSphCount = 45
}) => {
  // Form Header State
  const [sphNumber, setSphNumber] = useState('');
  const [subject, setSubject] = useState('Surat Penawaran Harga Kalibrasi');
  const [attachmentPages, setAttachmentPages] = useState('2 lembar');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [city, setCity] = useState('Surakarta');

  // Hospital Details State
  const [hospitalId, setHospitalId] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');

  // Items State
  const [items, setItems] = useState<SphItem[]>([]);

  // Negotiation & Pricing State
  const [accommodationFee, setAccommodationFee] = useState(0);
  const [isPpnIncluded, setIsPpnIncluded] = useState(true);
  const [negotiationTarget, setNegotiationTarget] = useState<string>('');
  const [negotiationType, setNegotiationType] = useState<'INCLUDE_PPN' | 'EXCLUDE_PPN' | 'DISCOUNT_PERCENT' | 'MANUAL'>('INCLUDE_PPN');
  const [status, setStatus] = useState<SphQuotation['status']>('Draft');
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(undefined);

  // Company and Signer Config
  const [marketingStaffName, setMarketingStaffName] = useState('Erwin');
  const [marketingStaffPhone, setMarketingStaffPhone] = useState('0852-0006-0589');
  const [directorName, setDirectorName] = useState('Ahmad Fajar Ariyanto');
  const [directorTitle, setDirectorTitle] = useState('Direktur');

  // Quick Catalog Picker State
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<string>('Semua');
  const [showCatalogModal, setShowCatalogModal] = useState(false);

  // Initialize or reset form
  useEffect(() => {
    if (initialSph) {
      setSphNumber(initialSph.sphNumber);
      setSubject(initialSph.subject);
      setAttachmentPages(initialSph.attachmentPages);
      setDate(initialSph.date);
      setCity(initialSph.city);
      setHospitalId(initialSph.hospitalId || '');
      setHospitalName(initialSph.hospitalName);
      setHospitalAddress(initialSph.hospitalAddress);
      setItems(initialSph.items);
      setAccommodationFee(initialSph.accommodationFee || 0);
      setIsPpnIncluded(initialSph.isPpnIncluded !== false);
      setNegotiationTarget(initialSph.negotiationTarget ? String(initialSph.negotiationTarget) : '');
      setNegotiationType(initialSph.negotiationType || 'INCLUDE_PPN');
      setStatus(initialSph.status);
      setPdfUrl(initialSph.pdfUrl);
      setMarketingStaffName(initialSph.marketingStaffName || 'Erwin');
      setMarketingStaffPhone(initialSph.marketingStaffPhone || '0852-0006-0589');
      setDirectorName(initialSph.directorName || 'Ahmad Fajar Ariyanto');
      setDirectorTitle(initialSph.directorTitle || 'Direktur');
    } else {
      // New SPH defaults
      setSphNumber(generateSphNumber(existingSphCount));
      setSubject('Surat Penawaran Harga Kalibrasi');
      setAttachmentPages('2 lembar');
      setDate(new Date().toISOString().split('T')[0]);
      setCity('Surakarta');
      setHospitalId('');
      setHospitalName('');
      setHospitalAddress('');
      setAccommodationFee(0);
      setIsPpnIncluded(true);
      setNegotiationTarget('');
      setNegotiationType('INCLUDE_PPN');
      setStatus('Draft');
      setPdfUrl(undefined);
      setMarketingStaffName('Erwin');
      setMarketingStaffPhone('0852-0006-0589');
      setDirectorName('Ahmad Fajar Ariyanto');
      setDirectorTitle('Direktur');

      // Add 1 default sample item
      setItems([
        {
          id: `item-${Date.now()}-1`,
          catalogNumber: 97,
          description: 'Thermohygrometer Analog',
          quantity: 10,
          unit: 'Pcs',
          standardPrice: 250000,
          unitPrice: 250000,
          totalPrice: 2500000,
          notes: ''
        }
      ]);
    }
  }, [initialSph, isOpen, existingSphCount]);

  // Handle hospital select
  const handleHospitalChange = (hId: string) => {
    setHospitalId(hId);
    const selected = hospitals.find(h => h.id === hId);
    if (selected) {
      setHospitalName(selected.name);
      setHospitalAddress(selected.address);
    }
  };

  // Add Item
  const handleAddItem = (tariff?: TariffItem) => {
    const newItem: SphItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      catalogNumber: tariff ? tariff.id : undefined,
      description: tariff ? tariff.name : '',
      quantity: 1,
      unit: tariff ? tariff.unit : 'Unit',
      standardPrice: tariff ? tariff.price : 0,
      unitPrice: tariff ? tariff.price : 0,
      totalPrice: tariff ? tariff.price : 0,
      notes: tariff?.notes || ''
    };
    setItems(prev => [...prev, newItem]);
  };

  // Remove Item
  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  // Update item field
  const handleUpdateItem = (id: string, field: keyof SphItem, value: any) => {
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const updated = { ...it, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Number(value) || 0 : it.quantity;
        const price = field === 'unitPrice' ? Number(value) || 0 : it.unitPrice;
        updated.totalPrice = qty * price;
      }
      return updated;
    }));
  };

  // Run Smart Negotiation Calculation
  const applyNegotiation = (targetValStr?: string, type?: 'INCLUDE_PPN' | 'EXCLUDE_PPN' | 'DISCOUNT_PERCENT') => {
    const numTarget = Number(targetValStr !== undefined ? targetValStr : negotiationTarget);
    const targetMode = type || negotiationType;

    if (!numTarget || numTarget <= 0) {
      // Reset back to brochure standard price
      resetToBrochurePrices();
      return;
    }

    const result = calculateNegotiation({
      items,
      targetAmount: numTarget,
      targetType: targetMode,
      includePpn: isPpnIncluded,
      accommodationFee: Number(accommodationFee) || 0
    });

    setItems(result.items);
  };

  // Reset to original brochure prices
  const resetToBrochurePrices = () => {
    setItems(prev => prev.map(it => ({
      ...it,
      unitPrice: it.standardPrice,
      totalPrice: it.quantity * it.standardPrice
    })));
    setNegotiationTarget('');
  };

  // Calculate live totals
  const subtotalOriginal = items.reduce((acc, it) => acc + (it.quantity * it.standardPrice), 0);
  const subtotal1 = items.reduce((acc, it) => acc + it.totalPrice, 0);
  const subtotal2 = subtotal1 + (Number(accommodationFee) || 0);
  const ppnAmount = isPpnIncluded ? Math.round(subtotal2 * 0.11) : 0;
  const grandTotal = subtotal2 + ppnAmount;
  const discountAmount = Math.max(0, subtotalOriginal - subtotal1);
  const discountPercent = subtotalOriginal > 0 ? (discountAmount / subtotalOriginal) * 100 : 0;

  // Filter Catalog
  const categories = ['Semua', ...Array.from(new Set(SPH_TARIFF_CATALOG.map(t => t.category)))];
  const filteredCatalog = SPH_TARIFF_CATALOG.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                          t.id.toString().includes(catalogSearch);
    const matchesCat = selectedCatalogCategory === 'Semua' || t.category === selectedCatalogCategory;
    return matchesSearch && matchesCat;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!hospitalName.trim()) {
      alert('Mohon isi nama Rumah Sakit tujuan penawaran!');
      return;
    }

    if (items.length === 0) {
      alert('Mohon tambahkan minimal 1 item alat medis!');
      return;
    }

    const calculated = calculateNegotiation({
      items,
      targetAmount: negotiationTarget ? Number(negotiationTarget) : undefined,
      targetType: negotiationTarget ? negotiationType : 'NONE',
      includePpn: isPpnIncluded,
      accommodationFee: Number(accommodationFee) || 0
    });

    const newSph: SphQuotation = {
      id: initialSph?.id || `SPH-${Date.now()}`,
      sphNumber: sphNumber || generateSphNumber(existingSphCount),
      subject,
      attachmentPages,
      date,
      city,
      hospitalId,
      hospitalName,
      hospitalAddress,
      items: calculated.items,
      subtotalOriginal,
      subtotal1,
      accommodationFee: Number(accommodationFee) || 0,
      subtotal2,
      ppnPercent: isPpnIncluded ? 11 : 0,
      isPpnIncluded,
      ppnAmount,
      grandTotal,
      terbilang: calculated.terbilang,
      marketingStaffName,
      marketingStaffPhone,
      directorName,
      directorTitle,
      bankName: 'Bank Mandiri Cab. Surakarta',
      bankAccountNumber: '138-00-2610846-9',
      bankAccountName: 'SARANA MULTI KALIBRASI PT',
      termsAndConditions: [
        isPpnIncluded ? 'Harga sudah termasuk PPN 11%.' : 'Harga belum termasuk PPN 11%.',
        'Harga sudah termasuk biaya transportasi dan akomodasi.',
        'Harga tidak termasuk service dan maintenance.',
        'Penawaran berlaku 1 bulan, sejak tanggal penawaran diterbitkan.',
        'Selama pekerjaan (on site) teknisi kami wajib didampingi oleh petugas atau staff setempat dalam proses kalibrasi.',
        'Apabila terdapat penambahan alat pada saat kalibrasi, segera dimutakhirkan BO (Bukti Order) dan di setujui pelanggan.',
        'Pekerjaan dianggap selesai setelah berita acara/BO (Bukti Order) di tanda tangani oleh pihak yang berwenang.',
        'Kalibrasi di atas termasuk sertifikat kalibrasi yang dikeluarkan oleh PT. Sarana Multi Kalibrasi.',
        'Pembayaran : Bank Mandiri Cab. Surakarta No. Rek : 138-00-2610846-9 (SARANA MULTI KALIBRASI PT)'
      ],
      status,
      negotiationTarget: negotiationTarget ? Number(negotiationTarget) : undefined,
      negotiationType,
      discountAmount,
      discountPercent,
      pdfUrl,
      createdAt: initialSph?.createdAt || date,
      validUntilDate: new Date(new Date(date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    onSave(newSph);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white border border-[#D8D2CB] rounded-2xl w-full max-w-5xl my-6 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header Modal - Flux Theme */}
        <div className="px-6 py-4 bg-[#1C658C] border-b border-[#144966] text-white flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 border border-white/20 rounded-xl text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{initialSph ? 'Edit Surat Penawaran Harga (SPH)' : 'Buat Surat Penawaran Harga (SPH) Baru'}</span>
                <span className="text-xs bg-white/20 text-white border border-white/30 px-2 py-0.5 rounded font-mono font-bold">
                  {sphNumber}
                </span>
              </h2>
              <p className="text-xs text-[#D8D2CB]">
                Lengkapi rincian alat kalibrasi dan gunakan Kalkulator Negosiasi Cerdas untuk menyesuaikan harga deal RS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1 text-slate-800 bg-[#EEEEEE]/30">
          
          {/* BAGIAN 1: METADATA SURAT & INFORMASI RUMAH SAKIT */}
          <div className="bg-white border border-[#D8D2CB] rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#D8D2CB]/60 pb-3">
              <h3 className="text-sm font-bold text-[#1C658C] flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>1. Data Surat & Rumah Sakit Tujuan</span>
              </h3>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 font-medium">Status SPH:</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="bg-[#EEEEEE] border border-[#D8D2CB] text-xs font-semibold text-slate-800 rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-[#1C658C] outline-none"
                >
                  <option value="Draft">Draft</option>
                  <option value="Terkirim ke RS">Terkirim ke RS</option>
                  <option value="Negosiasi">Proses Negosiasi</option>
                  <option value="Disetujui (Deal)">Disetujui (Deal)</option>
                  <option value="Ditolak">Ditolak</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              {/* Nomor SPH */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-medium text-slate-700 mb-1">Nomor SPH Resmi</label>
                <input
                  type="text"
                  value={sphNumber}
                  onChange={(e) => setSphNumber(e.target.value)}
                  className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none"
                  placeholder="045/SMK-SPH/VII-2026"
                  required
                />
              </div>

              {/* Tanggal Surat */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Surat</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none"
                  required
                />
              </div>

              {/* Kota Terbit */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-medium text-slate-700 mb-1">Kota Diterbitkan</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none"
                  placeholder="Surakarta"
                />
              </div>

              {/* Nama Rumah Sakit */}
              <div className="sm:col-span-12">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Rumah Sakit / Faskes <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none font-semibold"
                  placeholder="Contoh: RS Unim Islam YAKSSI Gemolong"
                  required
                />
              </div>

              {/* Alamat Rumah Sakit */}
              <div className="sm:col-span-12">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Alamat Lengkap Rumah Sakit <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={hospitalAddress}
                  onChange={(e) => setHospitalAddress(e.target.value)}
                  className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none"
                  placeholder="Jl. Raya Solo - Purwodadi KM. 20 Gemolong, Kabayanan II, Kragilan, Kec. Gemolong, Kabupaten Sragen..."
                  required
                />
              </div>
            </div>
          </div>

          {/* BAGIAN 2: KALKULATOR NEGOSIASI CERDAS (SMART NEGOTIATION ENGINE) */}
          <div className="bg-white border-2 border-[#1C658C] rounded-xl p-5 space-y-4 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D8D2CB] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#1C658C]/10 border border-[#1C658C]/30 rounded-xl text-[#1C658C]">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1C658C] flex items-center gap-2">
                    <span>2. Kalkulator Negosiasi & Target Deal Rumah Sakit</span>
                    <span className="bg-[#398AB9]/20 text-[#1C658C] text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold border border-[#398AB9]/30">
                      Otomatis Distribusi Proporsional
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Masukkan nominal deal yang diminta pihak RS — seluruh harga satuan alat otomatis dihitung ulang & disesuaikan presisi
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetToBrochurePrices}
                  className="px-3 py-1.5 bg-[#EEEEEE] hover:bg-[#D8D2CB]/60 text-slate-700 text-xs font-medium rounded-lg border border-[#D8D2CB] flex items-center gap-1.5 transition-all"
                  title="Kembalikan semua harga ke tarif resmi katalog brosur"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reset Harga Brosur</span>
                </button>
              </div>
            </div>

            {/* Negotiation Input Controls */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              
              {/* Target Deal Nominal Input */}
              <div className="md:col-span-5">
                <label className="block text-xs font-semibold text-[#1C658C] mb-1.5 flex items-center justify-between">
                  <span>Nominal Deal yang Diminta Pihak RS (Rp)</span>
                  <span className="text-[11px] text-slate-500 font-normal">Contoh: 100000000 atau 15000000</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#1C658C] font-bold text-xs">
                    Rp
                  </div>
                  <input
                    type="number"
                    value={negotiationTarget}
                    onChange={(e) => setNegotiationTarget(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyNegotiation(negotiationTarget);
                      }
                    }}
                    placeholder="Contoh: 100000000"
                    className="w-full bg-[#EEEEEE]/50 border-2 border-[#1C658C] rounded-xl pl-9 pr-4 py-2.5 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#1C658C] outline-none"
                  />
                </div>
              </div>

              {/* Mode Negosiasi */}
              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tipe Target Kesepakatan:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNegotiationType('INCLUDE_PPN');
                      if (negotiationTarget) applyNegotiation(negotiationTarget, 'INCLUDE_PPN');
                    }}
                    className={`px-2.5 py-2 rounded-lg text-xs font-medium border text-center transition-all ${
                      negotiationType === 'INCLUDE_PPN'
                        ? 'bg-[#1C658C] text-white border-[#1C658C] shadow-sm font-semibold'
                        : 'bg-[#EEEEEE] text-slate-700 border-[#D8D2CB] hover:bg-[#D8D2CB]/50'
                    }`}
                  >
                    Include PPN 11%
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNegotiationType('EXCLUDE_PPN');
                      if (negotiationTarget) applyNegotiation(negotiationTarget, 'EXCLUDE_PPN');
                    }}
                    className={`px-2.5 py-2 rounded-lg text-xs font-medium border text-center transition-all ${
                      negotiationType === 'EXCLUDE_PPN'
                        ? 'bg-[#1C658C] text-white border-[#1C658C] shadow-sm font-semibold'
                        : 'bg-[#EEEEEE] text-slate-700 border-[#D8D2CB] hover:bg-[#D8D2CB]/50'
                    }`}
                  >
                    Sebelum PPN (DPP)
                  </button>
                </div>
              </div>

              {/* Tombol Terapkan Negosiasi */}
              <div className="md:col-span-3">
                <button
                  type="button"
                  onClick={() => applyNegotiation()}
                  className="w-full py-2.5 px-4 bg-[#398AB9] hover:bg-[#2b769f] active:scale-98 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>Kalkulasi & Nego</span>
                </button>
              </div>

            </div>

            {/* Quick Simulation Badges (e.g. Diskon & Perbandingan Harga) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="bg-[#EEEEEE]/60 border border-[#D8D2CB] p-3 rounded-xl">
                <span className="text-slate-500 block text-[11px]">Nilai Awal Katalog Brosur:</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {formatRupiah(subtotalOriginal)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Total sebelum negosiasi</span>
              </div>

              <div className="bg-[#EEEEEE]/60 border border-[#D8D2CB] p-3 rounded-xl">
                <span className="text-slate-500 block text-[11px]">Potongan / Diskon Deal:</span>
                <span className="font-mono font-bold text-amber-700 text-sm">
                  {discountAmount > 0 ? `- ${formatRupiah(discountAmount)} (${discountPercent.toFixed(1)}%)` : '0% (Harga Normal)'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Penyesuaian per unit</span>
              </div>

              <div className="bg-[#1C658C] text-white border border-[#144966] p-3 rounded-xl shadow-xs">
                <span className="text-[#D8D2CB] block text-[11px] font-semibold">Total Deal Akhir (Grand Total):</span>
                <span className="font-mono font-black text-white text-base">
                  {formatRupiah(grandTotal)}
                </span>
                <span className="text-[10px] text-[#EEEEEE] block mt-0.5">
                  {isPpnIncluded ? 'Sudah Termasuk PPN 11%' : 'Tanpa PPN'}
                </span>
              </div>
            </div>

          </div>

          {/* BAGIAN 3: DAFTAR ALAT KESEHATAN YANG DITAWARKAN */}
          <div className="bg-white border border-[#D8D2CB] rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8D2CB]/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1C658C] flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  <span>3. Rincian Alat Kesehatan & Harga Penawaran</span>
                  <span className="text-xs bg-[#EEEEEE] text-slate-700 px-2 py-0.5 rounded-full font-mono border border-[#D8D2CB]">
                    {items.length} Item
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Daftar alat sesuai brosur resmi PT. Sarana Multi Kalibrasi
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCatalogModal(true)}
                  className="px-3 py-1.5 bg-[#1C658C] hover:bg-[#398AB9] text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Pilih dari Katalog Brosur (121 Alat)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem()}
                  className="px-3 py-1.5 bg-[#EEEEEE] hover:bg-[#D8D2CB]/60 text-slate-700 text-xs font-medium rounded-lg border border-[#D8D2CB] flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris Manual</span>
                </button>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto border border-[#D8D2CB] rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#EEEEEE] text-[#1C658C] border-b border-[#D8D2CB] font-bold">
                    <th className="px-3 py-2.5 w-10 text-center">No</th>
                    <th className="px-3 py-2.5 min-w-[200px]">Diskripsi (Nama Alat Kesehatan)</th>
                    <th className="px-3 py-2.5 w-20 text-center">Qty</th>
                    <th className="px-3 py-2.5 w-36 text-right">Harga Satuan (Rp)</th>
                    <th className="px-3 py-2.5 w-36 text-right">Total Harga (Rp)</th>
                    <th className="px-2 py-2.5 w-10 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8D2CB]/50">
                  {items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-[#EEEEEE]/40 transition-colors">
                      <td className="px-3 py-2 text-center text-slate-500 font-mono">
                        {index + 1}
                      </td>

                      {/* Deskripsi & Catatan */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                          placeholder="Nama alat kesehatan..."
                          className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded px-2.5 py-1 text-xs text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none font-medium"
                          required
                        />
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'notes', e.target.value)}
                          placeholder="Catatan khusus (misal: *Uji fungsi)..."
                          className="w-full bg-transparent border-0 text-[10px] text-slate-500 placeholder:text-slate-400 px-2 py-0.5 mt-0.5 focus:ring-0 outline-none italic"
                        />
                      </td>

                      {/* Qty */}
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded px-2 py-1 text-center text-xs font-bold text-slate-900 focus:ring-1 focus:ring-[#1C658C] outline-none"
                          required
                        />
                      </td>

                      {/* Negotiated Unit Price */}
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-32 bg-[#EEEEEE]/50 border border-[#398AB9] rounded px-2 py-1 text-right text-xs font-mono font-bold text-[#1C658C] focus:ring-1 focus:ring-[#1C658C] outline-none"
                          required
                        />
                      </td>

                      {/* Total Price */}
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                        Rp {formatNumber(item.totalPrice)}
                      </td>

                      {/* Delete */}
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                          title="Hapus baris alat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Ringkasan Perhitungan Bawah */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              
              {/* Opsi Tambahan (Akomodasi, PPN, PIC SMK) */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-[#EEEEEE]/40 border border-[#D8D2CB] rounded-xl">
                  <label className="text-slate-700 font-medium">Biaya Akomodasi & Transportasi (Rp):</label>
                  <input
                    type="number"
                    value={accommodationFee}
                    onChange={(e) => setAccommodationFee(parseFloat(e.target.value) || 0)}
                    className="w-36 bg-white border border-[#D8D2CB] rounded-lg px-2.5 py-1 text-right font-mono text-slate-900 text-xs"
                    placeholder="0"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-[#EEEEEE]/40 border border-[#D8D2CB] rounded-xl">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ppn-toggle"
                      checked={isPpnIncluded}
                      onChange={(e) => setIsPpnIncluded(e.target.checked)}
                      className="rounded border-[#D8D2CB] text-[#1C658C] focus:ring-[#1C658C] w-4 h-4 bg-white"
                    />
                    <label htmlFor="ppn-toggle" className="text-slate-700 font-medium cursor-pointer">
                      Kenakan Pajak Pertambahan Nilai (PPN 11%)
                    </label>
                  </div>
                  <span className="text-[#1C658C] font-mono font-bold">
                    {isPpnIncluded ? '11%' : '0%'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Marketing In Charge</label>
                    <input
                      type="text"
                      value={marketingStaffName}
                      onChange={(e) => setMarketingStaffName(e.target.value)}
                      className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded px-2 py-1 text-xs text-slate-900"
                      placeholder="Erwin"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">No. HP Marketing</label>
                    <input
                      type="text"
                      value={marketingStaffPhone}
                      onChange={(e) => setMarketingStaffPhone(e.target.value)}
                      className="w-full bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded px-2 py-1 text-xs text-slate-900"
                      placeholder="0852-0006-0589"
                    />
                  </div>
                </div>

                {/* Status Dokumen SPH */}
                <div className="p-3 bg-[#EEEEEE]/40 border border-[#D8D2CB] rounded-xl">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                    Status Dokumen SPH:
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-white border border-[#D8D2CB] rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-[#1C658C] cursor-pointer"
                  >
                    <option value="Draft">Draft (Konsep Internal)</option>
                    <option value="Terkirim ke RS">Terkirim ke RS (Review Manajemen)</option>
                    <option value="Negosiasi">Negosiasi (Penyesuaian Tarif/Volume)</option>
                    <option value="Disetujui (Deal)">Disetujui (Deal) ⚡ (Masuk Penjadwalan RS)</option>
                    <option value="Ditolak">Ditolak (Batal)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {status === 'Disetujui (Deal)' 
                      ? '⚡ Status Deal akan otomatis memasukkan penawaran ini ke agenda Penjadwalan Kalibrasi RS.'
                      : status === 'Draft' 
                      ? 'Draf disimpan internal dan belum diserahkan ke pihak rumah sakit.'
                      : status === 'Terkirim ke RS'
                      ? 'Menandai penawaran resmi telah terkirim dan menunggu keputusan pihak RS.'
                      : status === 'Negosiasi'
                      ? 'Sedang dalam proses penyesuaian tarif dengan manajemen rumah sakit.'
                      : 'Penawaran tidak disepakati atau dibatalkan oleh rumah sakit.'}
                  </p>
                  
                  <div className="mt-4 pt-4 border-t border-[#D8D2CB]">
                    <PdfUploader 
                      folder="sph"
                      documentId={initialSph?.id || sphNumber.replace(/[^a-zA-Z0-9_-]/g, '_') || `sph_${Date.now()}`}
                      existingPdfUrl={pdfUrl}
                      label="Upload Lampiran SPH / Dokumen Terkirim (PDF / Scan)"
                      onUploadSuccess={setPdfUrl}
                      onRemove={() => setPdfUrl(undefined)}
                    />
                  </div>
                </div>
              </div>

              {/* Rekapitulasi Angka (Subtotal 1, Akomodasi, PPN, Grand Total) */}
              <div className="bg-[#EEEEEE]/50 border border-[#D8D2CB] p-4 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total 1 (Harga Alat Kalibrasi):</span>
                  <span className="font-mono font-semibold text-slate-800">Rp {formatNumber(subtotal1)}</span>
                </div>

                {accommodationFee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Akomodasi & Transportasi:</span>
                    <span className="font-mono text-slate-800">Rp {formatNumber(accommodationFee)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>Total 2:</span>
                  <span className="font-mono font-semibold text-slate-800">Rp {formatNumber(subtotal2)}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>{isPpnIncluded ? 'PPN 11%:' : 'PPN (Non-Aktif):'}</span>
                  <span className="font-mono text-slate-800">Rp {formatNumber(ppnAmount)}</span>
                </div>

                <div className="border-t-2 border-[#1C658C] pt-2 flex justify-between items-center text-sm font-bold text-[#1C658C]">
                  <span className="uppercase">GRAND TOTAL DEAL:</span>
                  <span className="font-mono text-lg font-black">
                    Rp {formatNumber(grandTotal)}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#D8D2CB]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white hover:bg-[#EEEEEE] text-slate-700 text-xs font-semibold rounded-xl border border-[#D8D2CB] transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#1C658C] hover:bg-[#398AB9] active:scale-98 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Surat Penawaran Harga (SPH)</span>
            </button>
          </div>

        </form>

        {/* MODAL POPUP: KATALOG BROSUR 121 ALAT MEDIS */}
        {showCatalogModal && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-[#D8D2CB] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
              
              <div className="px-6 py-4 bg-[#1C658C] text-white border-b border-[#144966] flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Search className="w-5 h-5 text-[#EEEEEE]" />
                    <span>Pola Tarif Brosur Resmi PT. Sarana Multi Kalibrasi</span>
                  </h3>
                  <p className="text-xs text-[#D8D2CB]">
                    Standar Kemenkes RI No. 26062301565850001 • Total 121 Item Alat Medis
                  </p>
                </div>
                <button
                  onClick={() => setShowCatalogModal(false)}
                  className="p-1.5 text-white/80 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filter and Search Bar */}
              <div className="p-4 bg-[#EEEEEE]/50 border-b border-[#D8D2CB] grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-7 relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Cari nama alat (misal: Thermohygrometer, Infusion, Syringe, ECG)..."
                    className="w-full bg-white border border-[#D8D2CB] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-[#1C658C] outline-none"
                    autoFocus
                  />
                </div>
                <div className="sm:col-span-5">
                  <select
                    value={selectedCatalogCategory}
                    onChange={(e) => setSelectedCatalogCategory(e.target.value)}
                    className="w-full bg-white border border-[#D8D2CB] rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-[#1C658C] outline-none"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Catalog Items Grid / List */}
              <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-[#EEEEEE]/20">
                {filteredCatalog.map(tariff => {
                  return (
                    <div
                      key={tariff.id}
                      onClick={() => {
                        handleAddItem(tariff);
                      }}
                      className="p-3 bg-white hover:bg-[#EEEEEE]/60 border border-[#D8D2CB] hover:border-[#398AB9] rounded-xl flex items-center justify-between cursor-pointer transition-all shadow-xs group"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-[#EEEEEE] text-[#1C658C] border border-[#D8D2CB] px-1.5 py-0.2 rounded font-mono font-bold">
                            #{tariff.id}
                          </span>
                          <span className="font-semibold text-slate-900 group-hover:text-[#1C658C] transition-colors">
                            {tariff.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="text-[#1C658C] font-mono font-bold">
                            {formatRupiah(tariff.price)}
                          </span>
                          <span>•</span>
                          <span>{tariff.category}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-2.5 py-1 bg-[#1C658C]/10 hover:bg-[#1C658C] text-[#1C658C] hover:text-white border border-[#1C658C]/20 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="px-6 py-3 bg-[#EEEEEE] border-t border-[#D8D2CB] flex justify-between items-center text-xs text-slate-600">
                <span>Ditemukan {filteredCatalog.length} alat medis</span>
                <button
                  onClick={() => setShowCatalogModal(false)}
                  className="px-4 py-1.5 bg-[#1C658C] hover:bg-[#398AB9] text-white font-semibold rounded-lg shadow-xs transition-colors"
                >
                  Selesai Memilih
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
