import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Search, 
  Wallet, 
  Building2, 
  FileText, 
  Calendar, 
  CreditCard, 
  PieChart,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Download,
  Copy,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Link2,
  RefreshCw,
  Edit3,
  Trash2,
  Filter,
  CheckSquare,
  UserCheck,
  Briefcase,
  ExternalLink
} from 'lucide-react';
import { FinancialAsset, FinancialTransaction, Hospital, AuditStatus, MarketingStaff } from '../types';
import { formatRupiah, formatIndonesianDate, TODAY_STR } from '../utils/helpers';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface FinancialAssetManagerProps {
  financialAssets: FinancialAsset[];
  transactions: FinancialTransaction[];
  hospitals: Hospital[];
  marketingList?: MarketingStaff[];
  onAddTransaction: (trx: FinancialTransaction) => void;
  onUpdateTransaction?: (trx: FinancialTransaction) => void;
  onDeleteTransaction?: (trxId: string) => void;
  onAddFinancialAsset: (asset: FinancialAsset) => void;
  onUpdateFinancialAsset?: (asset: FinancialAsset) => void;
  onDeleteFinancialAsset?: (assetId: string) => void;
}

export const FinancialAssetManager: React.FC<FinancialAssetManagerProps> = ({
  financialAssets,
  transactions,
  hospitals,
  marketingList = [],
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onAddFinancialAsset,
  onUpdateFinancialAsset,
  onDeleteFinancialAsset
}) => {
  // Tabs: 'overview' | 'spreadsheet' | 'audit'
  const [activeTab, setActiveTab] = useState<'overview' | 'spreadsheet' | 'audit'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [trxTypeFilter, setTrxTypeFilter] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08'); // Default current month
  const [auditFilter, setAuditFilter] = useState<string>('ALL');

  // Modals
  const [showAddTrxModal, setShowAddTrxModal] = useState(false);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FinancialAsset | null>(null);
  const [auditTargetTrx, setAuditTargetTrx] = useState<FinancialTransaction | null>(null);
  const [showSpreadsheetSyncModal, setShowSpreadsheetSyncModal] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success'>('idle');
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    type: 'asset' | 'transaction';
    name: string;
    detail: string;
  } | null>(null);

  // New Transaction Form State
  const [trxType, setTrxType] = useState<'Pemasukan (Revenue Kalibrasi)' | 'Pengeluaran (Operasional Lapangan)' | 'Pengeluaran (Re-Kalibrasi BPFK/Alat)' | 'Pembelian Aset Baru'>('Pemasukan (Revenue Kalibrasi)');
  const [trxCategory, setTrxCategory] = useState('');
  const [trxAmount, setTrxAmount] = useState('');
  const [trxRef, setTrxRef] = useState('');
  const [trxDesc, setTrxDesc] = useState('');
  const [trxHospital, setTrxHospital] = useState('');
  const [trxMarketing, setTrxMarketing] = useState('');
  const [trxDate, setTrxDate] = useState(TODAY_STR);

  // New/Edit Asset Form State
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState<'Kas & Rekening Operasional' | 'Piutang Kontrak RS' | 'Investasi Alat Kalibrator' | 'Deposito & Cadangan' | 'Aset Lancar Lain'>('Kas & Rekening Operasional');
  const [assetAmount, setAssetAmount] = useState('');
  const [assetBank, setAssetBank] = useState('');
  const [assetAccountNo, setAssetAccountNo] = useState('');
  const [assetNotes, setAssetNotes] = useState('');
  const [assetStatus, setAssetStatus] = useState<'Aktif' | 'Pending Cair' | 'Dicadangkan'>('Aktif');

  // Audit Form State
  const [auditorNameInput, setAuditorNameInput] = useState('Hafizh Pasifianto, S.Tr.T. / KAP');
  const [auditStatusInput, setAuditStatusInput] = useState<AuditStatus>('Lolos Audit');
  const [auditNotesInput, setAuditNotesInput] = useState('');

  // Google Sheets Config
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('https://docs.google.com/spreadsheets/d/1SMK-PT-SaranaMultiKalibrasi-2026-Finance/edit');

  // Total Assets
  const totalAssets = financialAssets.reduce((acc, curr) => acc + curr.amount, 0);

  // Filter transactions by selected month (if not ALL)
  const monthFilteredTrx = transactions.filter(t => {
    if (selectedMonth === 'ALL') return true;
    return t.date.startsWith(selectedMonth);
  });

  const totalRevenue = monthFilteredTrx
    .filter(t => t.type.startsWith('Pemasukan'))
    .reduce((acc, curr) => acc + curr.amount, 0);
  
  const totalExpenses = monthFilteredTrx
    .filter(t => t.type.startsWith('Pengeluaran') || t.type.startsWith('Pembelian'))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const netCashflow = totalRevenue - totalExpenses;

  // Audit stats
  const auditedCount = transactions.filter(t => t.auditStatus === 'Lolos Audit').length;
  const auditPendingCount = transactions.filter(t => t.auditStatus === 'Belum Diaudit').length;
  const auditVerifiedCount = transactions.filter(t => t.auditStatus === 'Diverifikasi Auditor').length;
  const auditClarifyCount = transactions.filter(t => t.auditStatus === 'Perlu Klarifikasi').length;

  // Filtered transactions for view
  const filteredTransactions = monthFilteredTrx.filter(trx => {
    const matchesSearch = 
      trx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trx.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (trx.relatedHospitalName && trx.relatedHospitalName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (trx.marketingName && trx.marketingName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = trxTypeFilter === 'ALL' || trx.type === trxTypeFilter;
    const matchesAudit = auditFilter === 'ALL' || trx.auditStatus === auditFilter;

    return matchesSearch && matchesType && matchesAudit;
  });

  // Handler: Save New Transaction
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxCategory || !trxAmount) return;

    const newTrx: FinancialTransaction = {
      id: `TRX-2026-${Date.now().toString().slice(-4)}`,
      date: trxDate || TODAY_STR,
      type: trxType,
      category: trxCategory,
      amount: Number(trxAmount) || 0,
      referenceNo: trxRef || `REF/SMK/${Date.now().toString().slice(-6)}`,
      description: trxDesc,
      relatedHospitalName: trxHospital || undefined,
      marketingName: trxMarketing || undefined,
      recordedBy: 'Finance Dept PT SMK',
      auditStatus: 'Belum Diaudit'
    };

    onAddTransaction(newTrx);
    setShowAddTrxModal(false);
    setTrxCategory('');
    setTrxAmount('');
    setTrxDesc('');
    setTrxRef('');
    setTrxHospital('');
    setTrxMarketing('');
  };

  // Handler: Save / Update Asset
  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName || !assetAmount) return;

    if (editingAsset && onUpdateFinancialAsset) {
      onUpdateFinancialAsset({
        ...editingAsset,
        name: assetName,
        category: assetCategory,
        amount: Number(assetAmount) || 0,
        bankName: assetBank || undefined,
        accountNumber: assetAccountNo || undefined,
        status: assetStatus,
        notes: assetNotes,
        lastUpdated: TODAY_STR
      });
      setEditingAsset(null);
    } else {
      const newAsset: FinancialAsset = {
        id: `FIN-${Date.now().toString().slice(-4)}`,
        name: assetName,
        category: assetCategory,
        amount: Number(assetAmount) || 0,
        lastUpdated: TODAY_STR,
        bankName: assetBank || undefined,
        accountNumber: assetAccountNo || undefined,
        status: assetStatus,
        notes: assetNotes || 'Pencatatan pos aset baru PT. Sarana Multi Kalibrasi'
      };
      onAddFinancialAsset(newAsset);
    }

    setShowAddAssetModal(false);
    setAssetName('');
    setAssetAmount('');
    setAssetBank('');
    setAssetAccountNo('');
    setAssetNotes('');
  };

  const openEditAsset = (asset: FinancialAsset) => {
    setEditingAsset(asset);
    setAssetName(asset.name);
    setAssetCategory(asset.category);
    setAssetAmount(asset.amount.toString());
    setAssetBank(asset.bankName || '');
    setAssetAccountNo(asset.accountNumber || '');
    setAssetStatus(asset.status);
    setAssetNotes(asset.notes || '');
    setShowAddAssetModal(true);
  };

  // Handler: Perform Audit
  const handleSaveAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditTargetTrx || !onUpdateTransaction) return;

    const updatedTrx: FinancialTransaction = {
      ...auditTargetTrx,
      auditStatus: auditStatusInput,
      auditorName: auditorNameInput,
      auditedAt: TODAY_STR,
      auditNotes: auditNotesInput
    };

    onUpdateTransaction(updatedTrx);
    setAuditTargetTrx(null);
  };

  // Quick Audit Pass
  const handleQuickPassAudit = (trx: FinancialTransaction) => {
    if (!onUpdateTransaction) return;
    onUpdateTransaction({
      ...trx,
      auditStatus: 'Lolos Audit',
      auditorName: 'Hafizh Pasifianto, S.Tr.T. (Manajer Teknik)',
      auditedAt: TODAY_STR,
      auditNotes: 'Diverifikasi & disetujui tanpa temuan'
    });
  };

  // Export to CSV / Spreadsheet
  const handleExportCSV = () => {
    const periodLabel = selectedMonth === 'ALL' ? 'Semua-Periode' : `Bulan-${selectedMonth}`;
    const filename = `Laporan-Keuangan-SMK-${periodLabel}.csv`;

    const headers = [
      'ID Transaksi',
      'Tanggal',
      'Nomor Referensi',
      'Jenis Mutasi',
      'Kategori Transaksi',
      'Keterangan',
      'Rumah Sakit Terkait',
      'Marketing',
      'Pemasukan (Rp)',
      'Pengeluaran (Rp)',
      'Status Audit',
      'Auditor',
      'Tanggal Audit',
      'Catatan Audit'
    ];

    const rows = filteredTransactions.map(t => {
      const isIncome = t.type.startsWith('Pemasukan');
      return [
        `"${t.id}"`,
        `"${t.date}"`,
        `"${t.referenceNo}"`,
        `"${t.type}"`,
        `"${t.category.replace(/"/g, '""')}"`,
        `"${t.description.replace(/"/g, '""')}"`,
        `"${t.relatedHospitalName || '-'}"`,
        `"${t.marketingName || '-'}"`,
        isIncome ? t.amount : 0,
        !isIncome ? t.amount : 0,
        `"${t.auditStatus || 'Belum Diaudit'}"`,
        `"${t.auditorName || '-'}"`,
        `"${t.auditedAt || '-'}"`,
        `"${(t.auditNotes || '-').replace(/"/g, '""')}"`
      ].join(',');
    });

    // Add summary footer
    const summaryRows = [
      '',
      `"TOTAL REVENUE MASUK",,,,,,,,${totalRevenue},,`,
      `"TOTAL BIAYA KELUAR",,,,,,,,,${totalExpenses},`,
      `"SURPLUS / LABA BERSIH",,,,,,,,${netCashflow},,`
    ];

    const csvContent = '\uFEFF' + [headers.join(','), ...rows, ...summaryRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy as Google Sheets Table (TSV)
  const handleCopyForGoogleSheets = () => {
    const headers = [
      'Tanggal',
      'No. Ref',
      'Jenis Mutasi',
      'Kategori',
      'Keterangan',
      'Rumah Sakit',
      'Marketing',
      'Pemasukan (Rp)',
      'Pengeluaran (Rp)',
      'Status Audit',
      'Auditor'
    ].join('\t');

    const rows = filteredTransactions.map(t => {
      const isIncome = t.type.startsWith('Pemasukan');
      return [
        t.date,
        t.referenceNo,
        t.type,
        t.category,
        t.description,
        t.relatedHospitalName || '-',
        t.marketingName || '-',
        isIncome ? t.amount : 0,
        !isIncome ? t.amount : 0,
        t.auditStatus,
        t.auditorName || '-'
      ].join('\t');
    });

    const tsvContent = [headers, ...rows].join('\n');
    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3500);
    });
  };

  // Simulate Live Sync to Google Sheets
  const handleTriggerLiveSync = () => {
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 4000);
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-14" id="financial-asset-manager-root">
      {/* Toast Notification */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-500/50 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-xs font-bold">Data Spreadsheet Berhasil Disalin!</p>
            <p className="text-[11px] text-emerald-200">Buka Google Sheets dan tekan <kbd className="px-1.5 py-0.5 bg-emerald-950 rounded border border-emerald-700 font-mono">Ctrl + V</kbd> untuk menempelkan tabel.</p>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white text-slate-800 p-6 rounded-2xl border border-[#D8D2CB] shadow-xs relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-[#1C658C]/10 text-[#1C658C] rounded-xl border border-[#1C658C]/20">
              <Wallet className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1C658C]">
                  Aset Keuangan, Spreadsheet & Audit Mutasi
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1C658C]/10 text-[#1C658C] border border-[#1C658C]/20 font-mono">
                  PT. SMK
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Pengelolaan kas operasional, rekonsiliasi revenue RS, sinkronisasi Google Spreadsheet bulanan, dan audit transaksi resmi.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <button
            onClick={() => setShowSpreadsheetSyncModal(true)}
            className="bg-[#EEEEEE] hover:bg-[#D8D2CB]/50 text-[#1C658C] border border-[#D8D2CB] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#398AB9]" />
            <span>Konektor Spreadsheet</span>
          </button>

          <button
            onClick={() => {
              setEditingAsset(null);
              setAssetName('');
              setAssetAmount('');
              setAssetBank('');
              setAssetAccountNo('');
              setAssetNotes('');
              setShowAddAssetModal(true);
            }}
            className="bg-white hover:bg-[#EEEEEE] text-slate-700 border border-[#D8D2CB] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Pos Aset</span>
          </button>

          <button
            onClick={() => setShowAddTrxModal(true)}
            className="bg-[#1C658C] hover:bg-[#398AB9] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Uang Masuk / Keluar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets */}
        <div className="bg-white p-5 rounded-2xl border border-[#D8D2CB] shadow-xs relative group hover:border-[#398AB9] transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Total Valuasi Aset PT SMK</p>
            <span className="p-2 bg-[#1C658C]/10 text-[#1C658C] rounded-xl border border-[#1C658C]/20">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-[#1C658C] mt-2 font-mono tracking-tight">{formatRupiah(totalAssets)}</h3>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#D8D2CB]">
            <span className="text-[11px] text-[#398AB9] font-medium">Kas, Bank & Alat Kalibrator</span>
            <span className="text-[10px] text-slate-400">{financialAssets.length} Pos Aset</span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-[#D8D2CB] shadow-xs relative group hover:border-[#398AB9] transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Revenue Kalibrasi ({selectedMonth === 'ALL' ? 'Total' : selectedMonth})</p>
            <span className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-200">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-teal-700 mt-2 font-mono tracking-tight">{formatRupiah(totalRevenue)}</h3>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#D8D2CB]">
            <span className="text-[11px] text-teal-600 font-medium">Pemasukan Termin RS</span>
            <span className="text-[10px] text-slate-400">Mutasi Masuk</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-[#D8D2CB] shadow-xs relative group hover:border-[#398AB9] transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Biaya Lapangan & Lab BPFK</p>
            <span className="p-2 bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-rose-700 mt-2 font-mono tracking-tight">{formatRupiah(totalExpenses)}</h3>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#D8D2CB]">
            <span className="text-[11px] text-rose-600 font-medium">BBM, Tol & Kalibrasi Standar</span>
            <span className="text-[10px] text-slate-400">Mutasi Keluar</span>
          </div>
        </div>

        {/* Net Cashflow & Audit Status */}
        <div className="bg-white p-5 rounded-2xl border border-[#D8D2CB] shadow-xs relative group hover:border-[#398AB9] transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Surplus Kas & Lolos Audit</p>
            <span className="p-2 bg-[#1C658C]/10 text-[#1C658C] rounded-xl border border-[#1C658C]/20">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-[#1C658C] mt-2 font-mono tracking-tight">{formatRupiah(netCashflow)}</h3>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#D8D2CB]">
            <span className="text-[11px] text-emerald-700 font-medium">
              {auditedCount} dari {transactions.length} Lolos Audit
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px]">
              {Math.round((auditedCount / (transactions.length || 1)) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-[#D8D2CB] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#1C658C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-[#EEEEEE]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Portofolio & Mutasi Kas</span>
          </button>

          <button
            onClick={() => setActiveTab('spreadsheet')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'spreadsheet'
                ? 'bg-[#1C658C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-[#EEEEEE]'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Lembar Kerja Spreadsheet Bulanan</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-[#1C658C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-[#EEEEEE]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Modul Verifikasi & Audit ({auditPendingCount} Pending)</span>
          </button>
        </div>

        {/* Global Month Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 hidden sm:inline">Periode Bulanan:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white border border-[#D8D2CB] text-slate-800 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#1C658C]"
          >
            <option value="2026-08">Agustus 2026</option>
            <option value="2026-07">Juli 2026</option>
            <option value="2026-09">September 2026 (Proyeksi)</option>
            <option value="ALL">Semua Periode Transaksi</option>
          </select>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & ASSET PORTFOLIO */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Financial Assets Portfolio Grid */}
          <div className="bg-white rounded-2xl p-5 border border-[#D8D2CB] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-[#1C658C]">
                  Portofolio Pos Aset Keuangan PT. Sarana Multi Kalibrasi
                </h3>
                <p className="text-xs text-slate-500">
                  Pos akun kas, giro bank operasional, piutang invoice RS, dan nilai buku alat kalibrator.
                </p>
              </div>
              <span className="text-xs text-[#1C658C] font-mono font-bold">
                Total: {formatRupiah(totalAssets)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {financialAssets.map((asset) => (
                <div 
                  key={asset.id} 
                  className="p-4 rounded-xl bg-white border border-[#D8D2CB] hover:border-[#398AB9] transition-all flex flex-col justify-between group shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold bg-[#1C658C]/10 text-[#1C658C] border border-[#1C658C]/20 px-2 py-0.5 rounded">
                        {asset.category}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditAsset(asset)}
                          title="Edit Pos Aset"
                          className="p-1 text-slate-400 hover:text-[#1C658C] rounded transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteFinancialAsset && (
                          <button
                            onClick={() => {
                              setDeleteTarget({
                                id: asset.id,
                                type: 'asset',
                                name: asset.name,
                                detail: `Kategori: ${asset.category} • Nilai: ${formatRupiah(asset.amount)}`
                              });
                            }}
                            title="Hapus Pos Aset"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="font-bold text-sm text-slate-800 mt-1 group-hover:text-[#1C658C] transition-colors">
                      {asset.name}
                    </h4>

                    {asset.bankName && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        {asset.bankName} • Rek: <strong className="font-mono text-slate-700">{asset.accountNumber || '-'}</strong>
                      </p>
                    )}

                    {asset.notes && (
                      <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2">
                        {asset.notes}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#D8D2CB] flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-mono">Status: {asset.status}</span>
                    <span className="text-base font-black text-[#1C658C] font-mono">{formatRupiah(asset.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transactions Journal */}
          <div className="bg-white rounded-2xl p-5 border border-[#D8D2CB] shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#D8D2CB]">
              <div>
                <h3 className="font-bold text-base text-[#1C658C]">
                  Jurnal Mutasi Kas & Kontrak RS ({selectedMonth === 'ALL' ? 'Semua' : selectedMonth})
                </h3>
                <p className="text-xs text-slate-500">
                  Daftar uang masuk (revenue termin kalibrasi) dan uang keluar (operasional tim & re-kalibrasi BPFK).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari ref / RS / marketing..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1C658C]"
                  />
                </div>

                <select
                  value={trxTypeFilter}
                  onChange={(e) => setTrxTypeFilter(e.target.value)}
                  className="bg-white border border-[#D8D2CB] text-slate-700 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#1C658C]"
                >
                  <option value="ALL">Semua Jenis Mutasi</option>
                  <option value="Pemasukan (Revenue Kalibrasi)">Pemasukan (Revenue RS)</option>
                  <option value="Pengeluaran (Operasional Lapangan)">Pengeluaran (Operasional)</option>
                  <option value="Pengeluaran (Re-Kalibrasi BPFK/Alat)">Biaya Lab BPFK/Alat</option>
                  <option value="Pembelian Aset Baru">Pembelian Aset</option>
                </select>

                <button
                  onClick={handleExportCSV}
                  className="bg-[#EEEEEE] hover:bg-[#D8D2CB]/50 text-[#1C658C] border border-[#D8D2CB] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#EEEEEE]/60 text-slate-600 border-b border-[#D8D2CB] font-mono uppercase text-[10px]">
                    <th className="py-3 px-3 font-semibold">Tanggal</th>
                    <th className="py-3 px-3 font-semibold">No. Ref</th>
                    <th className="py-3 px-3 font-semibold">Jenis Mutasi</th>
                    <th className="py-3 px-3 font-semibold">Kategori & Keterangan</th>
                    <th className="py-3 px-3 font-semibold">Terkait RS / Marketing</th>
                    <th className="py-3 px-3 font-semibold text-right">Nominal</th>
                    <th className="py-3 px-3 font-semibold text-center">Status Audit</th>
                    <th className="py-3 px-3 font-semibold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8D2CB]/60">
                  {filteredTransactions.map((trx) => (
                    <tr key={trx.id} className="hover:bg-[#EEEEEE]/40 transition-colors">
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap font-mono">{formatIndonesianDate(trx.date)}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#1C658C] font-bold whitespace-nowrap">{trx.referenceNo}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          trx.type.startsWith('Pemasukan') 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {trx.type.startsWith('Pemasukan') ? 'Uang Masuk' : 'Uang Keluar'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800">{trx.category}</p>
                        <p className="text-slate-500 text-[11px] mt-0.5">{trx.description}</p>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <p className="text-slate-700 font-medium">{trx.relatedHospitalName || '-'}</p>
                        {trx.marketingName && (
                          <p className="text-[10px] text-[#398AB9] mt-0.5">Marketing: {trx.marketingName}</p>
                        )}
                      </td>
                      <td className={`py-3 px-3 text-right font-black whitespace-nowrap font-mono ${
                        trx.type.startsWith('Pemasukan') ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {trx.type.startsWith('Pemasukan') ? '+' : '-'} {formatRupiah(trx.amount)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          trx.auditStatus === 'Lolos Audit'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : trx.auditStatus === 'Diverifikasi Auditor'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : trx.auditStatus === 'Perlu Klarifikasi'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-300'
                        }`}>
                          {trx.auditStatus || 'Belum Diaudit'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setAuditTargetTrx(trx);
                              setAuditStatusInput(trx.auditStatus || 'Lolos Audit');
                              setAuditNotesInput(trx.auditNotes || '');
                            }}
                            title="Audit & Verifikasi"
                            className="p-1.5 bg-[#EEEEEE] hover:bg-[#398AB9]/20 text-[#1C658C] rounded-lg transition-colors cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                          {onDeleteTransaction && (
                            <button
                              onClick={() => {
                                setDeleteTarget({
                                  id: trx.id,
                                  type: 'transaction',
                                  name: `${trx.referenceNo} - ${trx.description}`,
                                  detail: `Jenis: ${trx.type} • Nominal: ${formatRupiah(trx.amount)}`
                                });
                              }}
                              title="Hapus Transaksi"
                              className="p-1.5 bg-[#EEEEEE] hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE SPREADSHEET VIEW */}
      {activeTab === 'spreadsheet' && (
        <div className="space-y-4">
          {/* Spreadsheet Controls & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#D8D2CB] shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-[#1C658C]/10 text-[#1C658C] rounded-xl border border-[#1C658C]/20">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-sm text-[#1C658C]">
                  Pratinjau Spreadsheet Bulanan ({selectedMonth === 'ALL' ? 'Semua Data' : selectedMonth})
                </h3>
                <p className="text-xs text-slate-500">
                  Data siap ekspor atau disalin langsung ke Google Sheets / Microsoft Excel.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyForGoogleSheets}
                className="bg-[#1C658C] hover:bg-[#398AB9] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>Salin ke Google Sheets</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="bg-[#EEEEEE] hover:bg-[#D8D2CB]/50 text-[#1C658C] border border-[#D8D2CB] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download File .CSV</span>
              </button>

              <button
                onClick={handleTriggerLiveSync}
                className="bg-white hover:bg-[#EEEEEE] text-slate-700 border border-[#D8D2CB] px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin text-[#1C658C]' : ''}`} />
                <span>{syncStatus === 'syncing' ? 'Menyinkronkan...' : syncStatus === 'success' ? 'Tersinkronkan!' : 'Sync Webhook'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Spreadsheet Grid */}
          <div className="bg-white rounded-2xl border border-[#D8D2CB] overflow-hidden shadow-xs">
            {/* Spreadsheet Ribbon Bar */}
            <div className="bg-[#EEEEEE]/70 px-4 py-2.5 border-b border-[#D8D2CB] flex items-center justify-between text-xs text-slate-600 font-mono">
              <div className="flex items-center gap-4">
                <span className="text-[#1C658C] font-bold">SHEET: Keuangan_{selectedMonth.replace('-', '_')}</span>
                <span>Baris: {filteredTransactions.length}</span>
                <span>Kolom: 11 (A - K)</span>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-emerald-700 font-bold">SUM(Pemasukan) = {formatRupiah(totalRevenue)}</span>
                <span className="text-slate-300">|</span>
                <span className="text-rose-700 font-bold">SUM(Pengeluaran) = {formatRupiah(totalExpenses)}</span>
                <span className="text-slate-300">|</span>
                <span className="text-[#1C658C] font-black">NET = {formatRupiah(netCashflow)}</span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  {/* Excel Column Letters Header */}
                  <tr className="bg-[#EEEEEE]/40 text-slate-500 border-b border-[#D8D2CB] text-[10px] text-center select-none">
                    <th className="py-1 px-2 border-r border-[#D8D2CB] w-10">#</th>
                    <th className="py-1 px-3 border-r border-[#D8D2CB]">A (Tanggal)</th>
                    <th className="py-1 px-3 border-r border-[#D8D2CB]">B (No. Ref)</th>
                    <th className="py-1 px-3 border-r border-[#D8D2CB]">C (Jenis Mutasi)</th>
                    <th className="py-1 px-3 border-r border-[#D8D2CB]">D (Kategori Transaksi)</th>
                    <th className="py-1 px-3 border-r border-[#D8D2CB]">E (Keterangan Rinci)</th>
                    <th className="py-1 px-3 border-r border-[#D8D2CB]">F (Rumah Sakit)</th>
                    <th className="py-1 px-3 border-r border-[#D8D2CB]">G (Marketing)</th>
                    <th className="py-1 px-3 border-r border-[#D8D2CB] text-right text-emerald-700">H (Masuk Rp)</th>
                    <th className="py-1 px-3 border-r border-[#D8D2CB] text-right text-rose-700">I (Keluar Rp)</th>
                    <th className="py-1 px-3 border-r border-[#D8D2CB] text-center">J (Audit)</th>
                    <th className="py-1 px-3 text-center">K (Auditor)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8D2CB]/60">
                  {filteredTransactions.map((trx, idx) => {
                    const isIncome = trx.type.startsWith('Pemasukan');
                    return (
                      <tr key={trx.id} className="hover:bg-[#EEEEEE]/50 transition-colors">
                        <td className="py-2 px-2 text-center text-slate-500 bg-[#EEEEEE]/30 border-r border-[#D8D2CB] font-bold select-none text-[10px]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 text-slate-700 border-r border-[#D8D2CB]/60 whitespace-nowrap">
                          {trx.date}
                        </td>
                        <td className="py-2 px-3 text-[#1C658C] font-bold border-r border-[#D8D2CB]/60 whitespace-nowrap">
                          {trx.referenceNo}
                        </td>
                        <td className="py-2 px-3 text-slate-700 border-r border-[#D8D2CB]/60 whitespace-nowrap">
                          {trx.type}
                        </td>
                        <td className="py-2 px-3 text-slate-900 font-medium border-r border-[#D8D2CB]/60">
                          {trx.category}
                        </td>
                        <td className="py-2 px-3 text-slate-500 border-r border-[#D8D2CB]/60 max-w-xs truncate">
                          {trx.description}
                        </td>
                        <td className="py-2 px-3 text-slate-700 border-r border-[#D8D2CB]/60 whitespace-nowrap">
                          {trx.relatedHospitalName || '-'}
                        </td>
                        <td className="py-2 px-3 text-[#398AB9] border-r border-[#D8D2CB]/60 whitespace-nowrap">
                          {trx.marketingName || '-'}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-700 font-bold border-r border-[#D8D2CB]/60 whitespace-nowrap">
                          {isIncome ? trx.amount.toLocaleString('id-ID') : 0}
                        </td>
                        <td className="py-2 px-3 text-right text-rose-700 font-bold border-r border-[#D8D2CB]/60 whitespace-nowrap">
                          {!isIncome ? trx.amount.toLocaleString('id-ID') : 0}
                        </td>
                        <td className="py-2 px-3 text-center border-r border-[#D8D2CB]/60 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            trx.auditStatus === 'Lolos Audit' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600 border border-slate-300'
                          }`}>
                            {trx.auditStatus}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-center whitespace-nowrap text-[11px]">
                          {trx.auditorName || '-'}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Summary Excel Footer Row */}
                  <tr className="bg-[#EEEEEE]/80 font-bold text-xs border-t-2 border-[#D8D2CB]">
                    <td className="py-2.5 px-2 text-center text-[#1C658C] bg-[#EEEEEE] border-r border-[#D8D2CB]">∑</td>
                    <td colSpan={6} className="py-2.5 px-3 text-slate-800 border-r border-[#D8D2CB]">
                      TOTAL REKAPITULASI SPREADSHEET BULANAN
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 border-r border-[#D8D2CB]">-</td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-black border-r border-[#D8D2CB] font-mono">
                      {totalRevenue.toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-700 font-black border-r border-[#D8D2CB] font-mono">
                      {totalExpenses.toLocaleString('id-ID')}
                    </td>
                    <td colSpan={2} className="py-2.5 px-3 text-center text-[#1C658C] font-black font-mono">
                      SURPLUS: {netCashflow.toLocaleString('id-ID')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT & RECONCILIATION MODULE */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-[#D8D2CB] shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D8D2CB]">
              <div>
                <h3 className="font-bold text-base text-[#1C658C] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#398AB9]" />
                  <span>Panel Verifikasi & Audit Keuangan PT SMK</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verifikasi bukti transfer rekening koran, invoice resmi, kuitansi BPFK, dan validitas SPK kalibrasi rumah sakit.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Filter Audit:</span>
                <select
                  value={auditFilter}
                  onChange={(e) => setAuditFilter(e.target.value)}
                  className="bg-white border border-[#D8D2CB] text-slate-800 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#1C658C]"
                >
                  <option value="ALL">Semua Status Audit</option>
                  <option value="Belum Diaudit">Belum Diaudit ({auditPendingCount})</option>
                  <option value="Diverifikasi Auditor">Diverifikasi Auditor ({auditVerifiedCount})</option>
                  <option value="Lolos Audit">Lolos Audit (Clean) ({auditedCount})</option>
                  <option value="Perlu Klarifikasi">Perlu Klarifikasi ({auditClarifyCount})</option>
                </select>
              </div>
            </div>

            {/* Audit Task List */}
            <div className="space-y-3 mt-4">
              {filteredTransactions.map((trx) => (
                <div 
                  key={trx.id}
                  className="p-4 rounded-xl bg-white border border-[#D8D2CB] hover:border-[#398AB9] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-[#1C658C] font-bold">{trx.referenceNo}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-500">{formatIndonesianDate(trx.date)}</span>
                      <span className="text-slate-300">•</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        trx.auditStatus === 'Lolos Audit'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : trx.auditStatus === 'Diverifikasi Auditor'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : trx.auditStatus === 'Perlu Klarifikasi'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {trx.auditStatus || 'Belum Diaudit'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-800">{trx.category}</h4>
                    <p className="text-xs text-slate-500">{trx.description}</p>

                    {trx.auditNotes && (
                      <div className="mt-2 p-2.5 bg-[#EEEEEE]/60 rounded-lg border border-[#D8D2CB] text-[11px] text-slate-700 flex items-start gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#398AB9]" />
                        <span><strong>Catatan Auditor ({trx.auditorName} • {trx.auditedAt}):</strong> {trx.auditNotes}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col items-center md:items-end justify-between gap-2 shrink-0">
                    <span className={`text-base font-black font-mono ${
                      trx.type.startsWith('Pemasukan') ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {trx.type.startsWith('Pemasukan') ? '+' : '-'} {formatRupiah(trx.amount)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleQuickPassAudit(trx)}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Lolos Audit</span>
                      </button>

                      <button
                        onClick={() => {
                          setAuditTargetTrx(trx);
                          setAuditStatusInput(trx.auditStatus || 'Lolos Audit');
                          setAuditNotesInput(trx.auditNotes || '');
                        }}
                        className="bg-[#EEEEEE] hover:bg-[#D8D2CB]/60 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-[#D8D2CB]"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Tinjau Rinci</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD TRANSACTION (UANG MASUK / KELUAR) */}
      {showAddTrxModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveTransaction} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#D8D2CB] text-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-[#1C658C] flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#398AB9]" />
                <span>Catat Transaksi Keuangan Baru</span>
              </h3>
              <span className="text-[10px] font-bold bg-[#1C658C]/10 text-[#1C658C] px-2 py-0.5 rounded font-mono border border-[#1C658C]/20">
                PT SMK
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Input mutasi penerimaan pembayaran RS atau pengeluaran operasional.</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tipe Mutasi Keuangan *</label>
                <select
                  value={trxType}
                  onChange={(e) => setTrxType(e.target.value as any)}
                  className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                >
                  <option value="Pemasukan (Revenue Kalibrasi)">Pemasukan (Revenue Jasa Kalibrasi RS)</option>
                  <option value="Pengeluaran (Operasional Lapangan)">Pengeluaran (BBM/Tol/Akomodasi Teknisi)</option>
                  <option value="Pengeluaran (Re-Kalibrasi BPFK/Alat)">Biaya Kalibrasi Lab BPFK / Standar Alat</option>
                  <option value="Pembelian Aset Baru">Pembelian Aset Kalibrator Baru</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kategori / Judul Transaksi *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pelunasan Invoice RS Siloam Kebon Jeruk (10 Unit)"
                  value={trxCategory}
                  onChange={(e) => setTrxCategory(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nominal (Rp) *</label>
                  <input
                    type="number"
                    required
                    placeholder="25000000"
                    value={trxAmount}
                    onChange={(e) => setTrxAmount(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 font-mono focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nomor Referensi / Invoice</label>
                  <input
                    type="text"
                    placeholder="INV/SMK/2026/08/..."
                    value={trxRef}
                    onChange={(e) => setTrxRef(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl font-mono text-slate-800 focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Transaksi</label>
                  <input
                    type="date"
                    value={trxDate}
                    onChange={(e) => setTrxDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 font-mono focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Marketing Terkait</label>
                  <select
                    value={trxMarketing}
                    onChange={(e) => setTrxMarketing(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                  >
                    <option value="">-- Pilih Marketing --</option>
                    {marketingList.map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Rumah Sakit Terkait</label>
                <select
                  value={trxHospital}
                  onChange={(e) => setTrxHospital(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                >
                  <option value="">-- Tidak Terikat RS Tertentu --</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.name}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Keterangan Tambahan</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan rincian pembayaran, termin kontrak, atau nomor rekening..."
                  value={trxDesc}
                  onChange={(e) => setTrxDesc(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#D8D2CB] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddTrxModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-[#EEEEEE] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="bg-[#1C658C] hover:bg-[#398AB9] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Simpan Transaksi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD / EDIT FINANCIAL ASSET */}
      {showAddAssetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveAsset} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#D8D2CB] text-slate-800">
            <h3 className="text-base font-bold text-[#1C658C]">
              {editingAsset ? 'Edit Pos Aset Keuangan' : 'Tambah Pos Aset Keuangan Baru'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">Daftarkan akun kas operasional, rekening bank, atau pos piutang.</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Pos Aset *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rekening Giro Bank BCA Operasional PT SMK"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kategori Aset *</label>
                <select
                  value={assetCategory}
                  onChange={(e) => setAssetCategory(e.target.value as any)}
                  className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                >
                  <option value="Kas & Rekening Operasional">Kas & Rekening Operasional</option>
                  <option value="Piutang Kontrak RS">Piutang Kontrak RS</option>
                  <option value="Investasi Alat Kalibrator">Investasi Alat Kalibrator</option>
                  <option value="Deposito & Cadangan">Deposito & Cadangan</option>
                  <option value="Aset Lancar Lain">Aset Lancar Lain</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Saldo / Nominal (Rp) *</label>
                  <input
                    type="number"
                    required
                    placeholder="50000000"
                    value={assetAmount}
                    onChange={(e) => setAssetAmount(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 font-mono focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status Pos</label>
                  <select
                    value={assetStatus}
                    onChange={(e) => setAssetStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Pending Cair">Pending Cair</option>
                    <option value="Dicadangkan">Dicadangkan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nama Bank (Jika Ada)</label>
                  <input
                    type="text"
                    placeholder="Bank Mandiri / BCA"
                    value={assetBank}
                    onChange={(e) => setAssetBank(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">No. Rekening</label>
                  <input
                    type="text"
                    placeholder="880-123-4567"
                    value={assetAccountNo}
                    onChange={(e) => setAssetAccountNo(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl font-mono text-slate-800 focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan peruntukan pos dana..."
                  value={assetNotes}
                  onChange={(e) => setAssetNotes(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#D8D2CB] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddAssetModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-[#EEEEEE] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="bg-[#1C658C] hover:bg-[#398AB9] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                {editingAsset ? 'Perbarui Pos Aset' : 'Simpan Pos Aset'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: AUDIT TRANSACTION */}
      {auditTargetTrx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveAudit} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#D8D2CB] text-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 bg-[#1C658C]/10 text-[#1C658C] rounded-xl border border-[#1C658C]/20">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-[#1C658C]">Verifikasi & Form Audit Transaksi</h3>
                <p className="text-xs text-slate-500">No. Ref: <span className="font-mono text-[#398AB9] font-bold">{auditTargetTrx.referenceNo}</span></p>
              </div>
            </div>

            {/* Target Summary */}
            <div className="p-3 bg-[#EEEEEE]/50 rounded-xl border border-[#D8D2CB] my-4 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Kategori:</span>
                <span className="font-bold text-slate-800">{auditTargetTrx.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nominal:</span>
                <span className="font-bold text-emerald-700 font-mono">{formatRupiah(auditTargetTrx.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rumah Sakit:</span>
                <span className="text-slate-700">{auditTargetTrx.relatedHospitalName || '-'}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Status Hasil Audit *</label>
                <select
                  value={auditStatusInput}
                  onChange={(e) => setAuditStatusInput(e.target.value as AuditStatus)}
                  className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                >
                  <option value="Lolos Audit">Lolos Audit (Valid & Bukti Lengkap)</option>
                  <option value="Diverifikasi Auditor">Diverifikasi Auditor (Menunggu Tanda Tangan)</option>
                  <option value="Perlu Klarifikasi">Perlu Klarifikasi (Ada Temuan / Bukti Kurang)</option>
                  <option value="Belum Diaudit">Belum Diaudit</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Auditor / Penanggung Jawab *</label>
                <input
                  type="text"
                  required
                  value={auditorNameInput}
                  onChange={(e) => setAuditorNameInput(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan Temuan / Rekomendasi Audit</label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Bukti potong PPh 23 terlampir, transfer rekening koran Mandiri sesuai 100%..."
                  value={auditNotesInput}
                  onChange={(e) => setAuditNotesInput(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#D8D2CB] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAuditTargetTrx(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-[#EEEEEE] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="bg-[#1C658C] hover:bg-[#398AB9] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Simpan Hasil Audit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: SPREADSHEET SYNC CONFIG */}
      {showSpreadsheetSyncModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#D8D2CB] text-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 bg-[#1C658C]/10 text-[#1C658C] rounded-xl border border-[#1C658C]/20">
                <FileSpreadsheet className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base font-bold text-[#1C658C]">Integrasi Google Spreadsheet</h3>
                <p className="text-xs text-slate-500">Koneksikan data mutasi keuangan & audit langsung ke Google Sheets.</p>
              </div>
            </div>

            <div className="space-y-4 my-4 text-xs">
              <div className="p-3 bg-[#EEEEEE]/60 border border-[#D8D2CB] rounded-xl text-slate-700">
                <p className="font-bold flex items-center gap-1.5 text-[#1C658C]">
                  <CheckCircle2 className="w-4 h-4 text-[#398AB9]" />
                  <span>2 Cara Mudah Tersambung ke Google Spreadsheet:</span>
                </p>
                <ol className="list-decimal list-inside mt-1.5 space-y-1 text-[11px] text-slate-600">
                  <li><strong>Metode Instan (1-Click Copy):</strong> Klik tombol <em>"Salin ke Google Sheets"</em> di tab lembar kerja, lalu paste (<kbd className="px-1 py-0.5 bg-white border border-[#D8D2CB] rounded text-[10px]">Ctrl+V</kbd>) langsung ke sheet baru.</li>
                  <li><strong>Metode File CSV:</strong> Download file <kbd className="px-1 py-0.5 bg-white border border-[#D8D2CB] rounded text-[10px]">.csv</kbd> bulanan lalu upload ke Google Drive / Spreadsheet.</li>
                </ol>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">URL Google Spreadsheet / Apps Script Webhook</label>
                <input
                  type="url"
                  value={googleSheetsUrl}
                  onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 font-mono focus:outline-none focus:border-[#1C658C]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#D8D2CB] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSpreadsheetSyncModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-[#EEEEEE] cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  handleTriggerLiveSync();
                  setShowSpreadsheetSyncModal(false);
                }}
                className="bg-[#1C658C] hover:bg-[#398AB9] text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Simpan & Sinkronkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Financial Asset / Transaction Deletion */}
      <ConfirmDeleteModal
        isOpen={deleteTarget !== null}
        title={deleteTarget?.type === 'asset' ? 'Hapus Pos Aset Keuangan?' : 'Hapus Catatan Transaksi?'}
        message={
          deleteTarget?.type === 'asset'
            ? 'Apakah Anda yakin ingin menghapus pos aset ini dari buku neraca keuangan?'
            : 'Apakah Anda yakin ingin menghapus baris transaksi pembukuan ini?'
        }
        itemName={deleteTarget ? `${deleteTarget.name} (${deleteTarget.detail})` : ''}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        onConfirm={() => {
          if (deleteTarget) {
            if (deleteTarget.type === 'asset' && onDeleteFinancialAsset) {
              onDeleteFinancialAsset(deleteTarget.id);
            } else if (deleteTarget.type === 'transaction' && onDeleteTransaction) {
              onDeleteTransaction(deleteTarget.id);
            }
          }
          setDeleteTarget(null);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
