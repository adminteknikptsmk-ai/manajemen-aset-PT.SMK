import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Plus, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  X, 
  Edit3, 
  AlertCircle, 
  Info,
  Layers,
  Save,
  Check
} from 'lucide-react';
import { BapDocument, BapItem, SphQuotation } from '../types';
import { exportBapToExcel } from '../utils/bapExcelExport';
import { recalculateBapItem, createBapFromSph } from '../utils/bapHelpers';

interface BapModalProps {
  isOpen: boolean;
  onClose: () => void;
  bapDocument?: BapDocument | null;
  sph?: SphQuotation | null;
  onSaveBap: (bap: BapDocument) => void;
}

type ActiveSheetTab = 'rekap' | 'bap' | 'rekap_non_po' | 'bap_non_po';

export const BapModal: React.FC<BapModalProps> = ({
  isOpen,
  onClose,
  bapDocument,
  sph,
  onSaveBap
}) => {
  // Active sheet tab
  const [activeTab, setActiveTab] = useState<ActiveSheetTab>('rekap');

  // Internal working copy of BAP
  const [bap, setBap] = useState<BapDocument>(() => {
    if (bapDocument) return bapDocument;
    if (sph) return createBapFromSph(sph);
    return {
      id: `BAP-${Date.now()}`,
      sphId: '',
      sphNumber: '',
      customerName: '',
      poDate: '',
      address: '',
      cityDistrict: '',
      labelNumber: '066',
      bastpNumber: '066/SMK/BASTP/IX/2026',
      dateColumns: ['Tgl 03', 'Tgl 04', 'Tgl 05'],
      items: [],
      nonPoItems: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  // Keep state in sync if props change
  useEffect(() => {
    if (bapDocument) {
      setBap(bapDocument);
    } else if (sph) {
      setBap(createBapFromSph(sph));
    }
  }, [bapDocument, sph]);

  // Date column input state
  const [newDateInput, setNewDateInput] = useState('');
  const [showAddDate, setShowAddDate] = useState(false);

  // New Non-PO item input state
  const [newNonPoName, setNewNonPoName] = useState('');
  const [newNonPoQty, setNewNonPoQty] = useState<number>(1);
  const [showAddNonPo, setShowAddNonPo] = useState(false);

  // Autosave notification
  const [savedBadge, setSavedBadge] = useState(false);

  const triggerSave = (updated: BapDocument) => {
    setBap(updated);
    onSaveBap(updated);
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 2000);
  };

  // Handlers for Header details
  const handleUpdateHeader = (field: keyof BapDocument, value: any) => {
    const updated = {
      ...bap,
      [field]: value,
      updatedAt: new Date().toISOString()
    };
    triggerSave(updated);
  };

  // Add Date Column (e.g. 'Tgl 06')
  const handleAddDateColumn = () => {
    if (!newDateInput.trim()) return;
    const cleanCol = newDateInput.trim();
    if (bap.dateColumns.includes(cleanCol)) {
      alert(`Kolom tanggal "${cleanCol}" sudah ada!`);
      return;
    }
    const updatedCols = [...bap.dateColumns, cleanCol];
    const updated: BapDocument = {
      ...bap,
      dateColumns: updatedCols,
      items: bap.items.map(it => recalculateBapItem(it, updatedCols)),
      nonPoItems: bap.nonPoItems.map(it => recalculateBapItem(it, updatedCols)),
      updatedAt: new Date().toISOString()
    };
    setNewDateInput('');
    setShowAddDate(false);
    triggerSave(updated);
  };

  // Remove Date Column
  const handleRemoveDateColumn = (colToRemove: string) => {
    if (bap.dateColumns.length <= 1) {
      alert('Minimal harus memiliki 1 kolom tanggal!');
      return;
    }
    if (!window.confirm(`Hapus kolom tanggal "${colToRemove}"? Nilai realisasi pada tanggal ini akan terhapus.`)) {
      return;
    }
    const updatedCols = bap.dateColumns.filter(c => c !== colToRemove);
    const updated: BapDocument = {
      ...bap,
      dateColumns: updatedCols,
      items: bap.items.map(it => {
        const newReal = { ...it.realisasi };
        delete newReal[colToRemove];
        return recalculateBapItem({ ...it, realisasi: newReal }, updatedCols);
      }),
      nonPoItems: bap.nonPoItems.map(it => {
        const newReal = { ...it.realisasi };
        delete newReal[colToRemove];
        return recalculateBapItem({ ...it, realisasi: newReal }, updatedCols);
      }),
      updatedAt: new Date().toISOString()
    };
    triggerSave(updated);
  };

  // Update Item in Sheet Rekap
  const handleUpdateItemRealisasi = (itemId: string, dateCol: string, valStr: string) => {
    const num = Math.max(0, parseInt(valStr, 10) || 0);
    const updatedItems = bap.items.map(it => {
      if (it.id !== itemId) return it;
      const updatedReal = {
        ...it.realisasi,
        [dateCol]: num
      };
      return recalculateBapItem({ ...it, realisasi: updatedReal }, bap.dateColumns);
    });

    const updated: BapDocument = {
      ...bap,
      items: updatedItems,
      updatedAt: new Date().toISOString()
    };
    triggerSave(updated);
  };

  // Update Item Keterangan
  const handleUpdateItemKeterangan = (itemId: string, ket: string) => {
    const updatedItems = bap.items.map(it => {
      if (it.id !== itemId) return it;
      return { ...it, keterangan: ket };
    });
    const updated: BapDocument = {
      ...bap,
      items: updatedItems,
      updatedAt: new Date().toISOString()
    };
    triggerSave(updated);
  };

  // Non-PO Management
  const handleAddNonPoItem = () => {
    if (!newNonPoName.trim()) return;
    const newItem: BapItem = {
      id: `nonpo-${Date.now()}-${bap.nonPoItems.length + 1}`,
      no: bap.nonPoItems.length + 1,
      namaAlat: newNonPoName.trim(),
      poQty: Math.max(1, newNonPoQty),
      realisasi: {},
      total: 0,
      sisa: Math.max(1, newNonPoQty),
      keterangan: ''
    };
    const updatedNonPo = [...bap.nonPoItems, newItem];
    const updated: BapDocument = {
      ...bap,
      nonPoItems: updatedNonPo,
      updatedAt: new Date().toISOString()
    };
    setNewNonPoName('');
    setNewNonPoQty(1);
    setShowAddNonPo(false);
    triggerSave(updated);
  };

  const handleRemoveNonPoItem = (itemId: string) => {
    const filtered = bap.nonPoItems.filter(it => it.id !== itemId);
    const reindexed = filtered.map((it, idx) => ({ ...it, no: idx + 1 }));
    const updated: BapDocument = {
      ...bap,
      nonPoItems: reindexed,
      updatedAt: new Date().toISOString()
    };
    triggerSave(updated);
  };

  const handleUpdateNonPoRealisasi = (itemId: string, dateCol: string, valStr: string) => {
    const num = Math.max(0, parseInt(valStr, 10) || 0);
    const updatedNonPo = bap.nonPoItems.map(it => {
      if (it.id !== itemId) return it;
      const updatedReal = {
        ...it.realisasi,
        [dateCol]: num
      };
      return recalculateBapItem({ ...it, realisasi: updatedReal }, bap.dateColumns);
    });

    const updated: BapDocument = {
      ...bap,
      nonPoItems: updatedNonPo,
      updatedAt: new Date().toISOString()
    };
    triggerSave(updated);
  };

  const handleUpdateNonPoKeterangan = (itemId: string, ket: string) => {
    const updatedNonPo = bap.nonPoItems.map(it => {
      if (it.id !== itemId) return it;
      return { ...it, keterangan: ket };
    });
    const updated: BapDocument = {
      ...bap,
      nonPoItems: updatedNonPo,
      updatedAt: new Date().toISOString()
    };
    triggerSave(updated);
  };

  // Calculations for Summary Row (Rekap / BAP)
  const rekapTotals = useMemo(() => {
    const totalPo = bap.items.reduce((sum, it) => sum + (Number(it.poQty) || 0), 0);
    const totalRealByDate: Record<string, number> = {};
    for (const col of bap.dateColumns) {
      totalRealByDate[col] = bap.items.reduce((sum, it) => sum + (Number(it.realisasi?.[col]) || 0), 0);
    }
    const totalAllReal = bap.items.reduce((sum, it) => sum + (Number(it.total) || 0), 0);
    const totalSisa = bap.items.reduce((sum, it) => sum + (Number(it.sisa) || 0), 0);

    return { totalPo, totalRealByDate, totalAllReal, totalSisa };
  }, [bap.items, bap.dateColumns]);

  // Calculations for Summary Row (Rekap Non PO / BAP Non PO)
  const nonPoTotals = useMemo(() => {
    const totalPo = bap.nonPoItems.reduce((sum, it) => sum + (Number(it.poQty) || 0), 0);
    const totalRealByDate: Record<string, number> = {};
    for (const col of bap.dateColumns) {
      totalRealByDate[col] = bap.nonPoItems.reduce((sum, it) => sum + (Number(it.realisasi?.[col]) || 0), 0);
    }
    const totalAllReal = bap.nonPoItems.reduce((sum, it) => sum + (Number(it.total) || 0), 0);
    const totalSisa = bap.nonPoItems.reduce((sum, it) => sum + (Number(it.sisa) || 0), 0);

    return { totalPo, totalRealByDate, totalAllReal, totalSisa };
  }, [bap.nonPoItems, bap.dateColumns]);

  // Download Excel Trigger
  const handleDownloadExcel = () => {
    exportBapToExcel(bap);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#D8D2CB] rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-slate-900 text-white border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#1C658C] text-white rounded-xl shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Berita Acara Pekerjaan (BAP) Kalibrasi
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-semibold">
                  Deal SPH Otomatis
                </span>
                {savedBadge && (
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1 animate-pulse">
                    <Check className="w-3 h-3" />
                    <span>Tersimpan</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                PT. Sarana Multi Kalibrasi • 4 Sheet Terintegrasi: Rekap, BAP, Rekap Non PO, BAP Non PO
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 active:scale-95 cursor-pointer"
              title="Download 1 file Excel (.xlsx) berisi 4 sheet lengkap: Rekap, BAP, Rekap Non PO, BAP Non PO"
            >
              <Download className="w-4 h-4" />
              <span>Download BAP (Excel)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* METADATA INFO HEADER (7 Baris Sesuai Format Resmi) */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
            
            {/* Col 1: Customer & PO */}
            <div className="md:col-span-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Nama RS. / Customer:</span>
                <input
                  type="text"
                  value={bap.customerName}
                  onChange={(e) => handleUpdateHeader('customerName', e.target.value)}
                  className="font-bold text-slate-900 text-right bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-[#1C658C] rounded px-1.5 py-0.5 outline-none w-56 truncate"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">No. PO (Nomor SPH):</span>
                <span className="font-mono font-bold text-[#1C658C] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                  {bap.sphNumber}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Tanggal PO:</span>
                <input
                  type="text"
                  value={bap.poDate}
                  onChange={(e) => handleUpdateHeader('poDate', e.target.value)}
                  className="text-slate-800 text-right bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-[#1C658C] rounded px-1.5 py-0.5 outline-none w-52"
                />
              </div>
            </div>

            {/* Col 2: Alamat & Kota */}
            <div className="md:col-span-5 space-y-1.5 border-l md:border-r border-slate-200 md:px-4">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-slate-500 whitespace-nowrap">Alamat:</span>
                <input
                  type="text"
                  value={bap.address}
                  onChange={(e) => handleUpdateHeader('address', e.target.value)}
                  className="text-slate-800 text-right bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-[#1C658C] rounded px-1.5 py-0.5 outline-none w-full"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-500 whitespace-nowrap">Kota/Kab.:</span>
                <input
                  type="text"
                  value={bap.cityDistrict}
                  onChange={(e) => handleUpdateHeader('cityDistrict', e.target.value)}
                  className="text-slate-800 text-right bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-[#1C658C] rounded px-1.5 py-0.5 outline-none w-full font-medium"
                />
              </div>
            </div>

            {/* Col 3: No. Label & No. BASTP */}
            <div className="md:col-span-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">No. Label:</span>
                <input
                  type="text"
                  value={bap.labelNumber}
                  onChange={(e) => handleUpdateHeader('labelNumber', e.target.value)}
                  placeholder="066"
                  className="font-mono font-bold text-slate-900 text-right bg-white border border-slate-300 focus:ring-1 focus:ring-[#1C658C] rounded px-2 py-0.5 outline-none w-24"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">No. BASTP:</span>
                <input
                  type="text"
                  value={bap.bastpNumber}
                  onChange={(e) => handleUpdateHeader('bastpNumber', e.target.value)}
                  placeholder="066/SMK/BASTP/IX/2026"
                  className="font-mono text-xs font-semibold text-slate-800 text-right bg-white border border-slate-300 focus:ring-1 focus:ring-[#1C658C] rounded px-2 py-0.5 outline-none w-44 truncate"
                />
              </div>
            </div>

          </div>
        </div>

        {/* TAB NAVIGATION: 4 SHEET SESUAI INSTRUKSI */}
        <div className="px-6 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          
          {/* 4 Tabs */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-300 text-xs shadow-xs">
            
            {/* 1. Rekap */}
            <button
              type="button"
              onClick={() => setActiveTab('rekap')}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'rekap' 
                  ? 'bg-[#1C658C] text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>1. Sheet "Rekap"</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono">
                {bap.items.length} Alat
              </span>
            </button>

            {/* 2. BAP */}
            <button
              type="button"
              onClick={() => setActiveTab('bap')}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'bap' 
                  ? 'bg-[#1C658C] text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>2. Sheet "BAP"</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                Auto Mirror
              </span>
            </button>

            {/* 3. Rekap Non PO */}
            <button
              type="button"
              onClick={() => setActiveTab('rekap_non_po')}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'rekap_non_po' 
                  ? 'bg-[#1C658C] text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>3. Sheet "Rekap Non PO"</span>
              {bap.nonPoItems.length > 0 && (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-mono">
                  {bap.nonPoItems.length}
                </span>
              )}
            </button>

            {/* 4. BAP Non PO */}
            <button
              type="button"
              onClick={() => setActiveTab('bap_non_po')}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'bap_non_po' 
                  ? 'bg-[#1C658C] text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>4. Sheet "BAP Non PO"</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                Auto Mirror
              </span>
            </button>

          </div>

          {/* Dynamic Date Columns Manager */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">Tanggal Realisasi:</span>
            
            <div className="flex items-center gap-1 flex-wrap">
              {bap.dateColumns.map(dCol => (
                <span 
                  key={dCol} 
                  className="inline-flex items-center gap-1 text-[11px] bg-white border border-slate-300 text-slate-800 px-2 py-0.5 rounded-md font-medium shadow-2xs"
                >
                  <span>{dCol}</span>
                  {bap.dateColumns.length > 1 && (activeTab === 'rekap' || activeTab === 'rekap_non_po') && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDateColumn(dCol)}
                      className="text-slate-400 hover:text-rose-600 ml-0.5"
                      title={`Hapus kolom ${dCol}`}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}

              {showAddDate ? (
                <div className="flex items-center gap-1 bg-white p-1 rounded-md border border-[#1C658C]">
                  <input
                    type="text"
                    value={newDateInput}
                    onChange={(e) => setNewDateInput(e.target.value)}
                    placeholder="e.g. Tgl 06"
                    className="text-xs px-1.5 py-0.5 w-20 outline-none font-medium"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddDateColumn();
                      if (e.key === 'Escape') setShowAddDate(false);
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddDateColumn}
                    className="px-2 py-0.5 bg-[#1C658C] text-white text-xs font-bold rounded"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddDate(false)}
                    className="text-slate-400 hover:text-slate-600 px-1 text-xs"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddDate(true)}
                  className="px-2 py-1 bg-white hover:bg-slate-50 text-[#1C658C] border border-[#1C658C]/40 hover:border-[#1C658C] text-[11px] font-bold rounded-md transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                  title="Tambah kolom tanggal realisasi pekerjaan di lapangan"
                >
                  <Plus className="w-3 h-3" />
                  <span>Tambah Tanggal</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* TAB CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          
          {/* TAB 1: SHEET REKAP (ACTIVE EDITING) */}
          {activeTab === 'rekap' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-2.5 rounded-xl text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#1C658C] shrink-0" />
                  <span>
                    <strong>Sheet "Rekap" (Data Pokok):</strong> Daftar alat & jumlah PO diambil otomatis dari SPH. Masukkan jumlah realisasi pada kolom tanggal (bisa ditambah kolom baru). Total, Sisa, dan Baris JUMLAH otomatis terkalkulasi.
                  </span>
                </div>
              </div>

              {/* Table Container */}
              <div className="bg-white border border-slate-300 rounded-xl overflow-x-auto shadow-xs">
                <table className="w-full text-xs text-left border-collapse min-w-[750px]">
                  <thead>
                    {/* Header Row 1 */}
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th rowSpan={2} className="px-3 py-2.5 text-center border-r border-slate-300 w-12">
                        No.
                      </th>
                      <th rowSpan={2} className="px-4 py-2.5 border-r border-slate-300 min-w-[220px]">
                        NAMA ALAT
                      </th>
                      <th rowSpan={2} className="px-3 py-2.5 text-center border-r border-slate-300 w-16 bg-blue-50/50">
                        PO
                      </th>
                      <th colSpan={bap.dateColumns.length} className="px-3 py-1.5 text-center border-r border-slate-300 bg-amber-50/60 text-amber-950">
                        REALISASI
                      </th>
                      <th rowSpan={2} className="px-3 py-2.5 text-center border-r border-slate-300 w-20 bg-emerald-50/50 font-bold text-emerald-900">
                        TOTAL
                      </th>
                      <th rowSpan={2} className="px-3 py-2.5 text-center border-r border-slate-300 w-16 bg-rose-50/50 font-bold text-rose-900">
                        SISA
                      </th>
                      <th rowSpan={2} className="px-4 py-2.5 min-w-[140px]">
                        KETERANGAN
                      </th>
                    </tr>
                    {/* Header Row 2 (Date Columns) */}
                    <tr className="bg-amber-50/40 text-amber-900 text-[11px] font-bold border-b border-slate-300">
                      {bap.dateColumns.map(dCol => (
                        <th key={dCol} className="px-2 py-1 text-center border-r border-slate-300 min-w-[70px]">
                          {dCol}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {bap.items.map((it, idx) => (
                      <tr key={it.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-2 text-center text-slate-500 font-mono border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2 font-medium text-slate-900 border-r border-slate-200">
                          {it.namaAlat}
                        </td>
                        <td className="px-3 py-2 text-center font-bold font-mono text-blue-900 bg-blue-50/20 border-r border-slate-200">
                          {it.poQty}
                        </td>

                        {/* Realisasi Date Inputs */}
                        {bap.dateColumns.map(dCol => (
                          <td key={dCol} className="px-1.5 py-1 text-center border-r border-slate-200 bg-amber-50/10">
                            <input
                              type="number"
                              min="0"
                              value={it.realisasi?.[dCol] ?? ''}
                              placeholder="0"
                              onChange={(e) => handleUpdateItemRealisasi(it.id, dCol, e.target.value)}
                              className="w-14 text-center font-mono font-semibold text-slate-900 bg-white border border-slate-300 hover:border-slate-400 focus:border-[#1C658C] focus:ring-1 focus:ring-[#1C658C] rounded px-1 py-0.5 outline-none transition-all"
                            />
                          </td>
                        ))}

                        {/* TOTAL (Otomatis) */}
                        <td className="px-3 py-2 text-center font-mono font-bold text-emerald-800 bg-emerald-50/20 border-r border-slate-200">
                          {it.total}
                        </td>

                        {/* SISA (Otomatis = PO - Total) */}
                        <td className={`px-3 py-2 text-center font-mono font-bold border-r border-slate-200 ${
                          it.sisa > 0 ? 'text-rose-700 bg-rose-50/20 font-bold' : 'text-slate-400'
                        }`}>
                          {it.sisa}
                        </td>

                        {/* Keterangan */}
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            value={it.keterangan || ''}
                            placeholder="e.g. Selesai, Batal, Tunda"
                            onChange={(e) => handleUpdateItemKeterangan(it.id, e.target.value)}
                            className={`w-full text-xs px-2 py-0.5 rounded border outline-none font-medium ${
                              it.keterangan?.toLowerCase().includes('batal')
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : it.keterangan?.toLowerCase().includes('selesai')
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-transparent hover:bg-white focus:bg-white border-transparent hover:border-slate-300 focus:border-[#1C658C]'
                            }`}
                          />
                        </td>
                      </tr>
                    ))}

                    {/* BARIS JUMLAH (OTOMATIS) */}
                    <tr className="bg-slate-100 font-bold text-slate-950 border-t-2 border-slate-400">
                      <td colSpan={2} className="px-4 py-2.5 text-center tracking-wider uppercase text-slate-900 border-r border-slate-300">
                        JUMLAH
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-blue-900 bg-blue-100/50 border-r border-slate-300">
                        {rekapTotals.totalPo}
                      </td>
                      {bap.dateColumns.map(dCol => (
                        <td key={dCol} className="px-2 py-2.5 text-center font-mono text-amber-950 bg-amber-100/40 border-r border-slate-300">
                          {rekapTotals.totalRealByDate[dCol] || 0}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center font-mono text-emerald-900 bg-emerald-100/50 border-r border-slate-300">
                        {rekapTotals.totalAllReal}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-rose-900 bg-rose-100/50 border-r border-slate-300">
                        {rekapTotals.totalSisa}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 font-normal italic text-[11px]">
                        {rekapTotals.totalSisa === 0 ? 'Semua Pekerjaan Selesai 100%' : `${rekapTotals.totalSisa} Unit Belum Terealisasi`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: SHEET BAP (AUTO MIRRORED FROM REKAP + SIGNATURES) */}
          {activeTab === 'bap' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    <strong>Sheet "BAP" (Tersinkronisasi Otomatis):</strong> Seluruh data item, PO, realisasi, total, dan sisa pada sheet ini menduplikasi langsung dari Sheet "Rekap" tanpa perlu input ulang. Dilengkapi tanda tangan resmi Teknisi Lapangan dan Admin.
                  </span>
                </div>
              </div>

              {/* Table Mirror View */}
              <div className="bg-white border border-slate-300 rounded-xl overflow-x-auto shadow-xs">
                <table className="w-full text-xs text-left border-collapse min-w-[750px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th rowSpan={2} className="px-3 py-2.5 text-center border-r border-slate-300 w-12">No.</th>
                      <th rowSpan={2} className="px-4 py-2.5 border-r border-slate-300 min-w-[220px]">NAMA ALAT</th>
                      <th rowSpan={2} className="px-3 py-2.5 text-center border-r border-slate-300 w-16 bg-blue-50/50">PO</th>
                      <th colSpan={bap.dateColumns.length} className="px-3 py-1.5 text-center border-r border-slate-300 bg-amber-50/60 text-amber-950">REALISASI</th>
                      <th rowSpan={2} className="px-3 py-2.5 text-center border-r border-slate-300 w-20 bg-emerald-50/50 text-emerald-900 font-bold">TOTAL</th>
                      <th rowSpan={2} className="px-3 py-2.5 text-center border-r border-slate-300 w-16 bg-rose-50/50 text-rose-900 font-bold">SISA</th>
                      <th rowSpan={2} className="px-4 py-2.5 min-w-[140px]">KETERANGAN</th>
                    </tr>
                    <tr className="bg-amber-50/40 text-amber-900 text-[11px] font-bold border-b border-slate-300">
                      {bap.dateColumns.map(dCol => (
                        <th key={dCol} className="px-2 py-1 text-center border-r border-slate-300 min-w-[70px]">{dCol}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {bap.items.map((it, idx) => (
                      <tr key={it.id || idx} className="hover:bg-slate-50/60">
                        <td className="px-3 py-2 text-center text-slate-500 font-mono border-r border-slate-200">{idx + 1}</td>
                        <td className="px-4 py-2 font-medium text-slate-900 border-r border-slate-200">{it.namaAlat}</td>
                        <td className="px-3 py-2 text-center font-bold font-mono text-blue-900 bg-blue-50/20 border-r border-slate-200">{it.poQty}</td>
                        {bap.dateColumns.map(dCol => (
                          <td key={dCol} className="px-2 py-2 text-center font-mono border-r border-slate-200 bg-amber-50/5">
                            {it.realisasi?.[dCol] || '-'}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center font-mono font-bold text-emerald-800 bg-emerald-50/20 border-r border-slate-200">{it.total}</td>
                        <td className="px-3 py-2 text-center font-mono font-bold text-slate-700 border-r border-slate-200">{it.sisa}</td>
                        <td className="px-3 py-2 text-slate-700">{it.keterangan || '-'}</td>
                      </tr>
                    ))}

                    {/* Baris JUMLAH */}
                    <tr className="bg-slate-100 font-bold text-slate-950 border-t-2 border-slate-400">
                      <td colSpan={2} className="px-4 py-2.5 text-center tracking-wider uppercase text-slate-900 border-r border-slate-300">JUMLAH</td>
                      <td className="px-3 py-2.5 text-center font-mono text-blue-900 bg-blue-100/50 border-r border-slate-300">{rekapTotals.totalPo}</td>
                      {bap.dateColumns.map(dCol => (
                        <td key={dCol} className="px-2 py-2.5 text-center font-mono text-amber-950 bg-amber-100/40 border-r border-slate-300">
                          {rekapTotals.totalRealByDate[dCol] || 0}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center font-mono text-emerald-900 bg-emerald-100/50 border-r border-slate-300">{rekapTotals.totalAllReal}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-rose-900 bg-rose-100/50 border-r border-slate-300">{rekapTotals.totalSisa}</td>
                      <td className="px-4 py-2.5"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signature Section (Sesuai Referensi) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div className="bg-white border border-slate-300 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold text-slate-900 block">
                    Di Isi Oleh Teknisi Lapangan:
                  </span>
                  <input
                    type="text"
                    value={bap.technicianName || ''}
                    placeholder="Nama Teknisi Lapangan..."
                    onChange={(e) => handleUpdateHeader('technicianName', e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-[#1C658C]"
                  />
                  <div className="h-16 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-xs italic">
                    Tanda Tangan Teknisi Lapangan
                  </div>
                </div>

                <div className="bg-white border border-slate-300 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold text-slate-900 block">
                    Di Isi Oleh Admin:
                  </span>
                  <input
                    type="text"
                    value={bap.adminName || ''}
                    placeholder="Nama Admin Teknik..."
                    onChange={(e) => handleUpdateHeader('adminName', e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-[#1C658C]"
                  />
                  <div className="h-16 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-xs italic">
                    Tanda Tangan Admin
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: SHEET REKAP NON PO (MANUAL EXTRA ITEMS) */}
          {activeTab === 'rekap_non_po' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    <strong>Sheet "Rekap Non PO":</strong> Struktur kolom sama persis dengan Rekap, dimulai dalam keadaan kosong untuk mencatat penambahan alat dadakan di luar SPH/PO awal.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddNonPo(true)}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Alat Non PO</span>
                </button>
              </div>

              {/* Add Non-PO Item Form */}
              {showAddNonPo && (
                <div className="bg-white border-2 border-amber-400 rounded-xl p-3.5 space-y-3 shadow-sm animate-in fade-in">
                  <span className="text-xs font-bold text-slate-900 block">
                    Tambah Alat Baru (Pekerjaan Non PO di Lapangan):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                    <div className="sm:col-span-8">
                      <label className="block text-slate-600 mb-1 font-medium">Nama Alat:</label>
                      <input
                        type="text"
                        value={newNonPoName}
                        onChange={(e) => setNewNonPoName(e.target.value)}
                        placeholder="e.g. Suction Pump Wall Tambahan, Tensi Digital Baru..."
                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-amber-600"
                        autoFocus
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-slate-600 mb-1 font-medium">Jumlah Unit (PO/Target):</label>
                      <input
                        type="number"
                        min="1"
                        value={newNonPoQty}
                        onChange={(e) => setNewNonPoQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-amber-600"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddNonPo(false)}
                      className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleAddNonPoItem}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs"
                    >
                      Tambahkan ke Non PO
                    </button>
                  </div>
                </div>
              )}

              {/* Table Container */}
              <div className="bg-white border border-slate-300 rounded-xl overflow-x-auto shadow-xs">
                <table className="w-full text-xs text-left border-collapse min-w-[750px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th rowSpan={2} className="px-3 py-2.5 text-center border-r border-slate-300 w-12">No.</th>
                      <th rowSpan={2} className="px-4 py-2.5 border-r border-slate-300 min-w-[220px]">NAMA ALAT</th>
                      <th rowSpan={2} className="px-3 py-2.5 text-center border-r border-slate-300 w-16 bg-blue-50/50">PO</th>
                      <th colSpan={bap.dateColumns.length} className="px-3 py-1.5 text-center border-r border-slate-300 bg-amber-50/60 text-amber-950">REALISASI</th>
                      <th rowSpan={2} className="px-3 py-2.5 text-center border-r border-slate-300 w-20 bg-emerald-50/50 text-emerald-900 font-bold">TOTAL</th>
                      <th rowSpan={2} className="px-3 py-2.5 text-center border-r border-slate-300 w-16 bg-rose-50/50 text-rose-900 font-bold">SISA</th>
                      <th rowSpan={2} className="px-4 py-2.5 min-w-[140px]">KETERANGAN</th>
                      <th rowSpan={2} className="px-2 py-2.5 text-center w-10">Aksi</th>
                    </tr>
                    <tr className="bg-amber-50/40 text-amber-900 text-[11px] font-bold border-b border-slate-300">
                      {bap.dateColumns.map(dCol => (
                        <th key={dCol} className="px-2 py-1 text-center border-r border-slate-300 min-w-[70px]">{dCol}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {bap.nonPoItems.length === 0 ? (
                      <tr>
                        <td colSpan={bap.dateColumns.length + 6} className="px-4 py-8 text-center text-slate-400 italic">
                          Belum ada item Non PO. Klik "+ Tambah Alat Non PO" di atas jika ada pekerjaan tambahan di lapangan.
                        </td>
                      </tr>
                    ) : (
                      bap.nonPoItems.map((it, idx) => (
                        <tr key={it.id || idx} className="hover:bg-slate-50/80">
                          <td className="px-3 py-2 text-center text-slate-500 font-mono border-r border-slate-200">{idx + 1}</td>
                          <td className="px-4 py-2 font-medium text-slate-900 border-r border-slate-200">{it.namaAlat}</td>
                          <td className="px-3 py-2 text-center font-bold font-mono text-blue-900 bg-blue-50/20 border-r border-slate-200">{it.poQty}</td>
                          {bap.dateColumns.map(dCol => (
                            <td key={dCol} className="px-1.5 py-1 text-center border-r border-slate-200 bg-amber-50/10">
                              <input
                                type="number"
                                min="0"
                                value={it.realisasi?.[dCol] ?? ''}
                                placeholder="0"
                                onChange={(e) => handleUpdateNonPoRealisasi(it.id, dCol, e.target.value)}
                                className="w-14 text-center font-mono font-semibold text-slate-900 bg-white border border-slate-300 rounded px-1 py-0.5 outline-none"
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center font-mono font-bold text-emerald-800 bg-emerald-50/20 border-r border-slate-200">{it.total}</td>
                          <td className="px-3 py-2 text-center font-mono font-bold text-slate-700 border-r border-slate-200">{it.sisa}</td>
                          <td className="px-2 py-1">
                            <input
                              type="text"
                              value={it.keterangan || ''}
                              placeholder="Keterangan..."
                              onChange={(e) => handleUpdateNonPoKeterangan(it.id, e.target.value)}
                              className="w-full text-xs px-2 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-[#1C658C] outline-none"
                            />
                          </td>
                          <td className="px-2 py-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveNonPoItem(it.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Hapus alat Non PO"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}

                    {/* Baris JUMLAH Non PO */}
                    <tr className="bg-slate-100 font-bold text-slate-950 border-t-2 border-slate-400">
                      <td colSpan={2} className="px-4 py-2.5 text-center tracking-wider uppercase text-slate-900 border-r border-slate-300">JUMLAH</td>
                      <td className="px-3 py-2.5 text-center font-mono text-blue-900 bg-blue-100/50 border-r border-slate-300">{nonPoTotals.totalPo}</td>
                      {bap.dateColumns.map(dCol => (
                        <td key={dCol} className="px-2 py-2.5 text-center font-mono text-amber-950 bg-amber-100/40 border-r border-slate-300">
                          {nonPoTotals.totalRealByDate[dCol] || 0}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center font-mono text-emerald-900 bg-emerald-100/50 border-r border-slate-300">{nonPoTotals.totalAllReal}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-rose-900 bg-rose-100/50 border-r border-slate-300">{nonPoTotals.totalSisa}</td>
                      <td colSpan={2} className="px-4 py-2.5 text-slate-400 font-normal italic text-[11px]">
                        Total Alat Tambahan Non PO
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SHEET BAP NON PO (AUTO MIRRORED FROM REKAP NON PO) */}
          {activeTab === 'bap_non_po' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    <strong>Sheet "BAP Non PO" (Tersinkronisasi Otomatis):</strong> Data pada sheet ini menduplikasi isi dari Sheet "Rekap Non PO" secara otomatis dan realtime.
                  </span>
                </div>
              </div>

              {/* Table Mirror View */}
              <div className="bg-white border border-slate-300 rounded-xl overflow-x-auto shadow-xs">
                <table className="w-full text-xs text-left border-collapse min-w-[750px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th rowSpan={2} className="px-3 py-2.5 text-center border-r border-slate-300 w-12">No.</th>
                      <th rowSpan={2} className="px-4 py-2.5 border-r border-slate-300 min-w-[220px]">NAMA ALAT</th>
                      <th rowSpan={2} className="px-3 py-2.5 text-center border-r border-slate-300 w-16 bg-blue-50/50">PO</th>
                      <th colSpan={bap.dateColumns.length} className="px-3 py-1.5 text-center border-r border-slate-300 bg-amber-50/60 text-amber-950">REALISASI</th>
                      <th rowSpan={2} className="px-3 py-2.5 text-center border-r border-slate-300 w-20 bg-emerald-50/50 text-emerald-900 font-bold">TOTAL</th>
                      <th rowSpan={2} className="px-3 py-2.5 text-center border-r border-slate-300 w-16 bg-rose-50/50 text-rose-900 font-bold">SISA</th>
                      <th rowSpan={2} className="px-4 py-2.5 min-w-[140px]">KETERANGAN</th>
                    </tr>
                    <tr className="bg-amber-50/40 text-amber-900 text-[11px] font-bold border-b border-slate-300">
                      {bap.dateColumns.map(dCol => (
                        <th key={dCol} className="px-2 py-1 text-center border-r border-slate-300 min-w-[70px]">{dCol}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {bap.nonPoItems.length === 0 ? (
                      <tr>
                        <td colSpan={bap.dateColumns.length + 5} className="px-4 py-8 text-center text-slate-400 italic">
                          Belum ada item Non PO. Format siap pakai (template).
                        </td>
                      </tr>
                    ) : (
                      bap.nonPoItems.map((it, idx) => (
                        <tr key={it.id || idx} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2 text-center text-slate-500 font-mono border-r border-slate-200">{idx + 1}</td>
                          <td className="px-4 py-2 font-medium text-slate-900 border-r border-slate-200">{it.namaAlat}</td>
                          <td className="px-3 py-2 text-center font-bold font-mono text-blue-900 bg-blue-50/20 border-r border-slate-200">{it.poQty}</td>
                          {bap.dateColumns.map(dCol => (
                            <td key={dCol} className="px-2 py-2 text-center font-mono border-r border-slate-200 bg-amber-50/5">
                              {it.realisasi?.[dCol] || '-'}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center font-mono font-bold text-emerald-800 bg-emerald-50/20 border-r border-slate-200">{it.total}</td>
                          <td className="px-3 py-2 text-center font-mono font-bold text-slate-700 border-r border-slate-200">{it.sisa}</td>
                          <td className="px-3 py-2 text-slate-700">{it.keterangan || '-'}</td>
                        </tr>
                      ))
                    )}

                    {/* Baris JUMLAH */}
                    <tr className="bg-slate-100 font-bold text-slate-950 border-t-2 border-slate-400">
                      <td colSpan={2} className="px-4 py-2.5 text-center tracking-wider uppercase text-slate-900 border-r border-slate-300">JUMLAH</td>
                      <td className="px-3 py-2.5 text-center font-mono text-blue-900 bg-blue-100/50 border-r border-slate-300">{nonPoTotals.totalPo}</td>
                      {bap.dateColumns.map(dCol => (
                        <td key={dCol} className="px-2 py-2.5 text-center font-mono text-amber-950 bg-amber-100/40 border-r border-slate-300">
                          {nonPoTotals.totalRealByDate[dCol] || 0}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center font-mono text-emerald-900 bg-emerald-100/50 border-r border-slate-300">{nonPoTotals.totalAllReal}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-rose-900 bg-rose-100/50 border-r border-slate-300">{nonPoTotals.totalSisa}</td>
                      <td className="px-4 py-2.5"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div className="bg-white border border-slate-300 rounded-xl p-4 space-y-2">
                  <span className="text-xs font-bold text-slate-900 block">
                    Di Isi Oleh Teknisi Lapangan:
                  </span>
                  <p className="text-xs font-medium text-slate-700">
                    {bap.technicianName || '(Nama Teknisi)'}
                  </p>
                </div>

                <div className="bg-white border border-slate-300 rounded-xl p-4 space-y-2">
                  <span className="text-xs font-bold text-slate-900 block">
                    Di Isi Oleh Admin:
                  </span>
                  <p className="text-xs font-medium text-slate-700">
                    {bap.adminName || '(Nama Admin)'}
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Otomatis tersimpan ke sistem • Format referensi 4 sheet aktif</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download BAP (Excel)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
