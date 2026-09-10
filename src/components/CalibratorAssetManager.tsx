import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Search, 
  Plus, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar, 
  DollarSign, 
  UserCheck, 
  CheckCircle2, 
  Clock, 
  Layers, 
  FileText,
  SlidersHorizontal,
  History,
  TrendingDown,
  Edit3,
  Trash2,
  Sparkles,
  RefreshCw,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';
import { CalibratorAsset, CalibratorCondition, Technician } from '../types';
import { formatRupiah, formatIndonesianDate, calculateDaysRemaining, TODAY_STR } from '../utils/helpers';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface CalibratorAssetManagerProps {
  calibrators: CalibratorAsset[];
  technicians: Technician[];
  onAddCalibrator: (newCalibrator: CalibratorAsset) => void;
  onUpdateCalibrator: (updated: CalibratorAsset) => void;
  onDeleteCalibrator?: (calibratorId: string) => void;
  onSyncOfficialCalibrators?: () => void;
}

export const CalibratorAssetManager: React.FC<CalibratorAssetManagerProps> = ({
  calibrators,
  technicians,
  onAddCalibrator,
  onUpdateCalibrator,
  onDeleteCalibrator,
  onSyncOfficialCalibrators
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [conditionFilter, setConditionFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedCalibrator, setSelectedCalibrator] = useState<CalibratorAsset | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCalibrator, setEditingCalibrator] = useState<CalibratorAsset | null>(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [deleteTargetCalibrator, setDeleteTargetCalibrator] = useState<CalibratorAsset | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Maintenance form state
  const [maintDesc, setMaintDesc] = useState('');
  const [maintCost, setMaintCost] = useState('');
  const [maintBy, setMaintBy] = useState('BPFK Jakarta (Laboratorium Kalibrasi)');
  const [newCertDate, setNewCertDate] = useState('');

  // New / Edit Calibrator Form State
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [newPurchasePrice, setNewPurchasePrice] = useState('');
  const [newLab, setNewLab] = useState('BPFK Jakarta (Terakreditasi KAN)');
  const [newCertNo, setNewCertNo] = useState('');
  const [newHolder, setNewHolder] = useState('');
  const [newCondition, setNewCondition] = useState<CalibratorCondition>('Sangat Baik');
  const [newLocation, setNewLocation] = useState('Ruang Master Metrologi PT SMK');

  // Calibration dates: Auto 1-year logic
  const [newCalDate, setNewCalDate] = useState(TODAY_STR);
  const [newDueDate, setNewDueDate] = useState('2027-08-30');

  // Automatically update due date to exactly 1 year after calibration date
  const handleCalDateChange = (dateVal: string) => {
    setNewCalDate(dateVal);
    if (dateVal) {
      try {
        const d = new Date(dateVal);
        d.setFullYear(d.getFullYear() + 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setNewDueDate(`${yyyy}-${mm}-${dd}`);
      } catch (err) {
        // fallback
      }
    }
  };

  const openAddModal = () => {
    setEditingCalibrator(null);
    setNewCode(`CAL-${Date.now().toString().slice(-4)}`);
    setNewName('');
    setNewBrand('Fluke Biomedical');
    setNewModel('');
    setNewSerial('');
    setNewPurchasePrice('125000000');
    setNewLab('BPFK Jakarta (Terakreditasi KAN)');
    setNewCertNo('');
    setNewHolder('');
    setNewCondition('Sangat Baik');
    setNewLocation('Ruang Master Metrologi PT SMK');
    handleCalDateChange(TODAY_STR);
    setShowAddModal(true);
  };

  const openEditModal = (cal: CalibratorAsset) => {
    setEditingCalibrator(cal);
    setNewCode(cal.code);
    setNewName(cal.name);
    setNewBrand(cal.brand);
    setNewModel(cal.model);
    setNewSerial(cal.serialNumber);
    setNewPurchasePrice(String(cal.purchasePrice));
    setNewLab(cal.calibrationLab);
    setNewCertNo(cal.certificateNumber);
    setNewHolder(cal.currentHolderTechnician || '');
    setNewCondition(cal.condition);
    setNewLocation(cal.location);
    setNewCalDate(cal.lastCalibratedDate);
    setNewDueDate(cal.nextCalibrationDueDate);
    setShowAddModal(true);
  };

  // Filtered List
  const filteredCalibrators = calibrators.filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.brand.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCondition = conditionFilter === 'ALL' || c.condition === conditionFilter;

    return matchesSearch && matchesCondition;
  });

  const totalValue = calibrators.reduce((acc, c) => acc + c.currentValue, 0);
  const totalPurchase = calibrators.reduce((acc, c) => acc + c.purchasePrice, 0);
  const expiringCount = calibrators.filter(c => c.condition === 'Perlu Kalibrasi Ulang').length;

  const handleSaveCalibrator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCode) return;

    const price = Number(newPurchasePrice) || 100000000;

    if (editingCalibrator) {
      const updated: CalibratorAsset = {
        ...editingCalibrator,
        code: newCode,
        name: newName,
        brand: newBrand || 'Standard Fluke/Rigel',
        model: newModel || 'Master Series',
        serialNumber: newSerial || `SN-${Date.now().toString().slice(-6)}`,
        purchasePrice: price,
        currentValue: price,
        lastCalibratedDate: newCalDate,
        nextCalibrationDueDate: newDueDate,
        calibrationLab: newLab,
        certificateNumber: newCertNo || `CERT-KAN-${Date.now().toString().slice(-4)}`,
        condition: newCondition,
        location: newLocation,
        currentHolderTechnician: newHolder || 'Tersedia di Lab PT SMK'
      };
      onUpdateCalibrator(updated);
    } else {
      const newItem: CalibratorAsset = {
        id: `CAL-${Date.now().toString().slice(-4)}`,
        code: newCode,
        name: newName,
        brand: newBrand || 'Standard Fluke/Rigel',
        model: newModel || 'Master Series',
        serialNumber: newSerial || `SN-${Date.now().toString().slice(-6)}`,
        purchaseDate: TODAY_STR,
        purchasePrice: price,
        currentValue: price,
        lastCalibratedDate: newCalDate,
        nextCalibrationDueDate: newDueDate, // 1 year auto
        calibrationLab: newLab,
        certificateNumber: newCertNo || `CERT-KAN-${Date.now().toString().slice(-4)}`,
        condition: newCondition,
        location: newLocation,
        currentHolderTechnician: newHolder || 'Tersedia di Lab PT SMK',
        maintenanceLog: [
          {
            date: TODAY_STR,
            description: 'Pencatatan inventaris baru & sertifikasi awal PT. Sarana Multi Kalibrasi',
            cost: 0,
            performedBy: 'Internal Metrologi PT SMK'
          }
        ]
      };
      onAddCalibrator(newItem);
    }

    setShowAddModal(false);
    setEditingCalibrator(null);
  };

  const handleAddMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCalibrator || !maintDesc) return;

    const costNum = Number(maintCost) || 0;
    const updated: CalibratorAsset = {
      ...selectedCalibrator,
      condition: 'Sangat Baik',
      lastCalibratedDate: TODAY_STR,
      nextCalibrationDueDate: newCertDate || '2027-08-30',
      maintenanceLog: [
        {
          date: TODAY_STR,
          description: maintDesc,
          cost: costNum,
          performedBy: maintBy
        },
        ...selectedCalibrator.maintenanceLog
      ]
    };

    onUpdateCalibrator(updated);
    setSelectedCalibrator(updated);
    setShowMaintenanceModal(false);
    setMaintDesc('');
    setMaintCost('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white text-slate-800 p-5 rounded-2xl border border-[#D8D2CB] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#1C658C]/10 text-[#1C658C] rounded-xl border border-[#1C658C]/20">
              <Wrench className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[#1C658C]">
                  Aset Alat Kalibrator Medis Master
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#1C658C]/10 text-[#1C658C] border border-[#1C658C]/20 font-mono">
                  {calibrators.length} Unit Master Terdata
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Data resmi 57 alat standar kalibrasi PT SMK (sesuai PDF/Spreadsheet), masa berlaku sertifikat KAN/BPFK 1 tahun, dan log uji kelayakan.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onSyncOfficialCalibrators && (
            <button
              onClick={() => {
                setIsSyncing(true);
                onSyncOfficialCalibrators();
                setTimeout(() => setIsSyncing(false), 800);
              }}
              disabled={isSyncing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Sinkronkan 57 Master Kalibrator ke Database Cloud Firestore"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan 57 Master'}</span>
            </button>
          )}

          <button
            onClick={openAddModal}
            className="bg-[#1C658C] hover:bg-[#398AB9] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            id="btn-add-calibrator"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Alat</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#D8D2CB] shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Nilai Buku Alat</p>
          <h3 className="text-2xl font-black text-[#1C658C] mt-1 font-mono">{formatRupiah(totalValue)}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Nilai perolehan awal: {formatRupiah(totalPurchase)}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#D8D2CB] shadow-xs">
          <p className="text-xs font-medium text-slate-500">Jumlah Unit Kalibrator</p>
          <h3 className="text-2xl font-black text-[#398AB9] mt-1 font-mono">{calibrators.length} Unit Master</h3>
          <p className="text-[11px] text-slate-400 mt-1">
            {calibrators.filter(c => c.condition === 'Sangat Baik' || c.condition === 'Siap Pakai').length} Unit Siap Lapangan
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#D8D2CB] shadow-xs">
          <p className="text-xs font-medium text-slate-500">Status Re-Kalibrasi BPFK</p>
          <h3 className={`text-2xl font-black mt-1 font-mono ${expiringCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {expiringCount > 0 ? `${expiringCount} Unit Butuh Kalibrasi` : '100% Sertifikat Aktif'}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Standar Akreditasi KAN LK-012-IDN</p>
        </div>
      </div>

      {/* Search & Filter & View Toggle */}
      <div className="bg-white p-4 rounded-2xl border border-[#D8D2CB] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kode, nama alat, merek, tipe, no seri..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1C658C]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="bg-white border border-[#D8D2CB] text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#1C658C]"
          >
            <option value="ALL">Semua Kondisi ({calibrators.length})</option>
            <option value="Sangat Baik">Sangat Baik ({calibrators.filter(c => c.condition === 'Sangat Baik').length})</option>
            <option value="Siap Pakai">Siap Pakai ({calibrators.filter(c => c.condition === 'Siap Pakai').length})</option>
            <option value="Perlu Kalibrasi Ulang">Perlu Kalibrasi Ulang ({calibrators.filter(c => c.condition === 'Perlu Kalibrasi Ulang').length})</option>
            <option value="Dalam Perbaikan">Dalam Perbaikan ({calibrators.filter(c => c.condition === 'Dalam Perbaikan').length})</option>
          </select>

          {/* View Mode Toggle: Table vs Cards */}
          <div className="flex items-center bg-[#EEEEEE] p-1 rounded-xl border border-[#D8D2CB]">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-[#1C658C] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabel Lengkap</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-[#1C658C] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kartu Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* TABLE VIEW (Complete Table of 57 Master Calibrator Assets) */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-[#D8D2CB] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#D8D2CB] bg-[#EEEEEE]/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1C658C]" />
              <h3 className="font-bold text-sm text-slate-800">
                Tabel Master 57 Alat Kalibrator Standar Medis PT. SMK
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Menampilkan {filteredCalibrators.length} dari {calibrators.length} unit
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 uppercase tracking-wider font-bold border-b border-[#D8D2CB]">
                  <th className="px-3.5 py-3 text-center w-12">No</th>
                  <th className="px-3.5 py-3 min-w-[100px]">Kode</th>
                  <th className="px-4 py-3 min-w-[200px]">Nama Alat Kalibrator</th>
                  <th className="px-3.5 py-3 min-w-[140px]">Merk & Tipe</th>
                  <th className="px-3.5 py-3 min-w-[120px]">No. Seri</th>
                  <th className="px-4 py-3 min-w-[170px]">Lab Kalibrasi / KAN</th>
                  <th className="px-3.5 py-3 min-w-[130px]">No. Sertifikat</th>
                  <th className="px-3.5 py-3 min-w-[130px]">Tgl & Jatuh Tempo</th>
                  <th className="px-3 py-3 text-center min-w-[110px]">Kondisi</th>
                  <th className="px-3.5 py-3 text-right min-w-[100px]">Nilai Buku</th>
                  <th className="px-3 py-3 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCalibrators.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-slate-400">
                      <Wrench className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600">Tidak ada alat kalibrator yang cocok dengan pencarian</p>
                      <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter kondisi.</p>
                    </td>
                  </tr>
                ) : (
                  filteredCalibrators.map((cal, index) => {
                    const daysToExpire = calculateDaysRemaining(cal.nextCalibrationDueDate, TODAY_STR);
                    const isExpiringSoon = daysToExpire <= 30;

                    return (
                      <tr key={cal.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-3 text-center font-bold text-slate-700 font-mono">
                          {index + 1}
                        </td>
                        <td className="px-3.5 py-3">
                          <span className="font-mono font-bold text-[11px] bg-[#1C658C]/10 text-[#1C658C] border border-[#1C658C]/20 px-2 py-0.5 rounded whitespace-nowrap">
                            {cal.code}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 leading-snug">{cal.name}</div>
                          {cal.priceRange && (
                            <div className="text-[10px] text-slate-400 mt-0.5">Est: {cal.priceRange}</div>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-slate-700">
                          <div className="font-medium">{cal.brand}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{cal.model}</div>
                        </td>
                        <td className="px-3.5 py-3 font-mono font-bold text-slate-800 text-[11px]">
                          {cal.serialNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div className="font-medium truncate max-w-[160px]">{cal.calibrationLab}</div>
                          {cal.traceability && (
                            <div className="text-[10px] text-sky-700 font-mono">KAN: {cal.traceability}</div>
                          )}
                        </td>
                        <td className="px-3.5 py-3 font-mono text-[11px] text-slate-700">
                          {cal.certificateNumber || '-'}
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="text-slate-800 font-mono text-[11px]">{formatIndonesianDate(cal.lastCalibratedDate)}</div>
                          <div className={`text-[10px] font-mono font-bold ${isExpiringSoon ? 'text-amber-600' : 'text-emerald-700'}`}>
                            s/d {formatIndonesianDate(cal.nextCalibrationDueDate)}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                            cal.condition === 'Sangat Baik' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                            cal.condition === 'Siap Pakai' ? 'bg-teal-100 text-teal-800 border-teal-300' :
                            'bg-amber-100 text-amber-800 border-amber-300'
                          }`}>
                            {cal.condition}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-bold text-[#1C658C] whitespace-nowrap">
                          {formatRupiah(cal.currentValue)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditModal(cal)}
                              className="p-1.5 text-slate-600 hover:text-[#1C658C] hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit Alat"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCalibrator(cal);
                                setShowMaintenanceModal(true);
                              }}
                              className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors"
                              title="Log & Re-Kalibrasi"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            {onDeleteCalibrator && (
                              <button
                                onClick={() => setDeleteTargetCalibrator(cal)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Hapus Alat"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CARDS GRID VIEW */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCalibrators.map((cal) => {
            const daysToExpire = calculateDaysRemaining(cal.nextCalibrationDueDate, TODAY_STR);
            const isExpiringSoon = daysToExpire <= 30;

            return (
              <div
                key={cal.id}
                className="bg-white rounded-2xl border border-[#D8D2CB] hover:border-[#398AB9] shadow-xs transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-4 border-b border-[#D8D2CB] bg-[#EEEEEE]/40">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-[11px] font-bold bg-[#1C658C]/10 text-[#1C658C] border border-[#1C658C]/20 px-2 py-0.5 rounded">
                      {cal.code}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      cal.condition === 'Sangat Baik' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                      cal.condition === 'Siap Pakai' ? 'bg-teal-100 text-teal-800 border-teal-300' :
                      'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {cal.condition}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-800 group-hover:text-[#1C658C] transition-colors line-clamp-1">
                    {cal.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {cal.brand} • {cal.model}
                  </p>
                </div>

                <div className="p-4 space-y-2.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Nomor Seri:</span>
                    <span className="font-mono font-bold text-slate-800">{cal.serialNumber}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-500">
                    <span>Lab Penguji KAN:</span>
                    <span className="text-slate-700 truncate max-w-[170px]">{cal.calibrationLab}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-500">
                    <span>Tanggal Kalibrasi:</span>
                    <span className="text-slate-800 font-mono">{formatIndonesianDate(cal.lastCalibratedDate)}</span>
                  </div>

                  <div className="p-2.5 bg-[#EEEEEE]/60 rounded-xl border border-[#D8D2CB]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">Habis Masa Kalibrasi (1 Thn):</span>
                      <span className={`text-xs font-mono font-bold ${isExpiringSoon ? 'text-amber-600' : 'text-emerald-700'}`}>
                        {formatIndonesianDate(cal.nextCalibrationDueDate)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {daysToExpire > 0 ? `Sisa ${daysToExpire} hari lagi` : 'Kedaluwarsa / Perlu Re-Kalibrasi'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-slate-500 pt-1">
                    <span>Pemegang / Lokasi:</span>
                    <span className="text-[#1C658C] font-medium truncate max-w-[160px]">{cal.currentHolderTechnician || cal.location}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#D8D2CB]">
                    <span className="text-slate-500">Nilai Buku:</span>
                    <span className="text-sm font-black text-[#1C658C] font-mono">{formatRupiah(cal.currentValue)}</span>
                  </div>
                </div>

                <div className="p-3 bg-[#EEEEEE]/50 border-t border-[#D8D2CB] flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => openEditModal(cal)}
                    className="flex-1 bg-white hover:bg-[#EEEEEE] text-[#1C658C] border border-[#D8D2CB] text-xs font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Alat</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedCalibrator(cal);
                      setShowMaintenanceModal(true);
                    }}
                    className="bg-[#1C658C]/10 hover:bg-[#1C658C]/20 text-[#1C658C] border border-[#1C658C]/30 text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Log Kalibrasi</span>
                  </button>

                  {onDeleteCalibrator && (
                    <button
                      onClick={() => setDeleteTargetCalibrator(cal)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Hapus Alat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD / EDIT CALIBRATOR */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveCalibrator} className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#D8D2CB] max-h-[90vh] overflow-y-auto text-slate-800">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-[#1C658C] flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#1C658C]" />
                <span>{editingCalibrator ? 'Edit Alat Kalibrator' : 'Tambah Aset Alat Kalibrator Baru'}</span>
              </h3>
              <span className="text-[10px] font-bold bg-[#1C658C]/10 text-[#1C658C] px-2 py-0.5 rounded font-mono">
                PT SMK
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Nama alat, tanggal kalibrasi, dan masa berlaku 1 tahun otomatis terhitung.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kode Alat Kalibrator *</label>
                <input
                  type="text"
                  required
                  placeholder="CAL-ESA-07"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full p-2.5 bg-[#EEEEEE]/50 border border-[#D8D2CB] rounded-xl font-mono text-[#1C658C] font-bold focus:outline-none focus:border-[#1C658C]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Lengkap Alat Kalibrator *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Fluke Biomedical ESA615 Electrical Safety Analyzer"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Merek & Pabrikan</label>
                  <input
                    type="text"
                    placeholder="Fluke Biomedical (USA)"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Model / Tipe</label>
                  <input
                    type="text"
                    placeholder="ESA615 Automated"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nomor Seri</label>
                  <input
                    type="text"
                    placeholder="FLK-SN-991823"
                    value={newSerial}
                    onChange={(e) => setNewSerial(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl font-mono text-slate-800 focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Harga Perolehan / Nilai Buku (Rp)</label>
                  <input
                    type="number"
                    placeholder="185000000"
                    value={newPurchasePrice}
                    onChange={(e) => setNewPurchasePrice(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-[#1C658C] font-bold font-mono focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
              </div>

              {/* CALIBRATION DATES WITH AUTO 1-YEAR EXPIRY LOGIC */}
              <div className="p-3.5 bg-[#EEEEEE]/50 rounded-xl border border-[#D8D2CB] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1C658C] text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#398AB9]" />
                    <span>Masa Berlaku Kalibrasi (Otomatis 1 Tahun)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Standar BPFK / KAN</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tanggal Kalibrasi *</label>
                    <input
                      type="date"
                      required
                      value={newCalDate}
                      onChange={(e) => handleCalDateChange(e.target.value)}
                      className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 font-mono focus:outline-none focus:border-[#1C658C]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tanggal Habis Kalibrasi (+1 Thn)</label>
                    <input
                      type="date"
                      required
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full p-2.5 bg-white border border-[#1C658C] rounded-xl text-[#1C658C] font-bold font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Lab Penguji BPFK/KAN</label>
                  <input
                    type="text"
                    value={newLab}
                    onChange={(e) => setNewLab(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">No. Sertifikat Kalibrasi</label>
                  <input
                    type="text"
                    placeholder="CERT-BPFK-2026-991"
                    value={newCertNo}
                    onChange={(e) => setNewCertNo(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 font-mono focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kondisi Alat</label>
                  <select
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value as CalibratorCondition)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                  >
                    <option value="Sangat Baik">Sangat Baik</option>
                    <option value="Siap Pakai">Siap Pakai</option>
                    <option value="Perlu Kalibrasi Ulang">Perlu Kalibrasi Ulang</option>
                    <option value="Dalam Perbaikan">Dalam Perbaikan</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Penanggung Jawab / Pemegang</label>
                  <select
                    value={newHolder}
                    onChange={(e) => setNewHolder(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                  >
                    <option value="">Tersedia di Lab Master PT SMK</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.name}>{t.name} ({t.status})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#D8D2CB] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-[#EEEEEE]"
              >
                Batal
              </button>
              <button
                type="submit"
                className="bg-[#1C658C] hover:bg-[#398AB9] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                {editingCalibrator ? 'Simpan Perubahan Alat' : 'Simpan Aset Kalibrator'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: MAINTENANCE / LOG RE-KALIBRASI */}
      {showMaintenanceModal && selectedCalibrator && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddMaintenance} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#D8D2CB] text-slate-800">
            <h3 className="text-base font-bold text-[#1C658C]">
              Log Kalibrasi Ulang & Pemeliharaan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              {selectedCalibrator.code} - {selectedCalibrator.name}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Rincian Tindakan / Pengujian *</label>
                <input
                  type="text"
                  required
                  placeholder="Re-kalibrasi berkala BPFK & penggantian fuse pengaman"
                  value={maintDesc}
                  onChange={(e) => setMaintDesc(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Biaya Lab / Perbaikan (Rp)</label>
                  <input
                    type="number"
                    placeholder="4500000"
                    value={maintCost}
                    onChange={(e) => setMaintCost(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-[#1C658C] font-bold font-mono focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Pelaksana / Lab</label>
                  <input
                    type="text"
                    value={maintBy}
                    onChange={(e) => setMaintBy(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#D8D2CB] rounded-xl text-slate-800 focus:outline-none focus:border-[#1C658C]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanggal Habis Kalibrasi Baru (1 Tahun Kedepan)</label>
                <input
                  type="date"
                  value={newCertDate || '2027-08-30'}
                  onChange={(e) => setNewCertDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#1C658C] rounded-xl text-[#1C658C] font-bold font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#D8D2CB] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowMaintenanceModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-[#EEEEEE]"
              >
                Batal
              </button>
              <button
                type="submit"
                className="bg-[#1C658C] hover:bg-[#398AB9] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Simpan Log Perawatan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Modal for Calibrator Deletion */}
      <ConfirmDeleteModal
        isOpen={deleteTargetCalibrator !== null}
        title="Hapus Master Kalibrator?"
        message="Apakah Anda yakin ingin menghapus aset alat kalibrator ini dari daftar master? Seluruh catatan riwayat ketertelusuran kalibrasi alat ini akan terhapus."
        itemName={deleteTargetCalibrator ? `${deleteTargetCalibrator.code} - ${deleteTargetCalibrator.name} (${deleteTargetCalibrator.brand})` : ''}
        confirmText="Ya, Hapus Alat"
        cancelText="Batal"
        onConfirm={() => {
          if (deleteTargetCalibrator && onDeleteCalibrator) {
            onDeleteCalibrator(deleteTargetCalibrator.id);
          }
          setDeleteTargetCalibrator(null);
        }}
        onClose={() => setDeleteTargetCalibrator(null)}
      />
    </div>
  );
};
