import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Building2, 
  FileCheck, 
  Printer, 
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  Filter,
  FileText,
  Award,
  Check,
  Edit3,
  LayoutDashboard,
  Layers
} from 'lucide-react';
import { CalibrationSchedule, DeviceSeliaItem, SeliaStatus } from '../types';
import { ensureDeviceSeliaItems, formatIndonesianDate, TODAY_STR } from '../utils/helpers';
import { SeliaDashboard } from './SeliaDashboard';

interface PostCalibrationSeliaManagerProps {
  schedules: CalibrationSchedule[];
  onUpdateSchedule: (schedule: CalibrationSchedule) => void;
}

export const PostCalibrationSeliaManager: React.FC<PostCalibrationSeliaManagerProps> = ({
  schedules,
  onUpdateSchedule
}) => {
  const [viewMode, setViewMode] = useState<'dashboard' | 'per_hospital'>('dashboard');

  // Filter schedules that have finished calibration or are in selia review
  const completedSchedules = schedules.filter(s => 
    s.status === 'Selesai Kalibrasi' || 
    s.status === 'Sertifikat Terbit' || 
    s.progressPercent === 100 ||
    (s.seliaItems && s.seliaItems.length > 0)
  );

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(
    completedSchedules.length > 0 ? completedSchedules[0].id : (schedules.length > 0 ? schedules[0].id : '')
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeliaStatus, setFilterSeliaStatus] = useState<string>('all');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* View Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              viewMode === 'dashboard'
                ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md border border-cyan-400/50'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-cyan-300" />
            <span>⚡ Selia Dashboard (Pemetaan Alat Medis & Sertifikat)</span>
          </button>

          <button
            onClick={() => setViewMode('per_hospital')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              viewMode === 'per_hospital'
                ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md border border-cyan-400/50'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 text-cyan-300" />
            <span>Tampilan Rincian Per RS</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{completedSchedules.length} Jadwal Selesai Kalibrasi</span>
        </div>
      </div>

      {viewMode === 'dashboard' ? (
        <SeliaDashboard schedules={schedules} onUpdateSchedule={onUpdateSchedule} />
      ) : (
        <PerHospitalSeliaView 
          schedules={schedules}
          completedSchedules={completedSchedules}
          selectedScheduleId={selectedScheduleId}
          setSelectedScheduleId={setSelectedScheduleId}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterSeliaStatus={filterSeliaStatus}
          setFilterSeliaStatus={setFilterSeliaStatus}
          savedNotice={savedNotice}
          setSavedNotice={setSavedNotice}
          onUpdateSchedule={onUpdateSchedule}
        />
      )}
    </div>
  );
};

interface PerHospitalSeliaViewProps {
  schedules: CalibrationSchedule[];
  completedSchedules: CalibrationSchedule[];
  selectedScheduleId: string;
  setSelectedScheduleId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterSeliaStatus: string;
  setFilterSeliaStatus: (s: string) => void;
  savedNotice: string | null;
  setSavedNotice: (msg: string | null) => void;
  onUpdateSchedule: (schedule: CalibrationSchedule) => void;
}

const PerHospitalSeliaView: React.FC<PerHospitalSeliaViewProps> = ({
  schedules,
  completedSchedules,
  selectedScheduleId,
  setSelectedScheduleId,
  searchQuery,
  setSearchQuery,
  filterSeliaStatus,
  setFilterSeliaStatus,
  savedNotice,
  setSavedNotice,
  onUpdateSchedule
}) => {
  const activeSchedule = schedules.find(s => s.id === selectedScheduleId) || completedSchedules[0] || schedules[0];

  if (!activeSchedule) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-400 my-4">
        <Building2 className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Belum Ada Data RS Selesai Kalibrasi</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Silakan selesaikan proses kalibrasi lapangan pada menu <strong className="text-cyan-400">Penjadwalan RS</strong> dengan menekan tombol <strong className="text-emerald-400">"Sudah Selesai Kalibrasi"</strong>.
        </p>
      </div>
    );
  }

  // Ensure 1-by-1 itemized unit items exist
  const seliaItems: DeviceSeliaItem[] = ensureDeviceSeliaItems(activeSchedule);

  // Filter items by search & status
  const filteredItems = seliaItems.filter(item => {
    const matchesSearch = 
      item.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.unitTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brandModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.labelNumber && item.labelNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.keterangan && item.keterangan.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = filterSeliaStatus === 'all' || item.seliaStatus === filterSeliaStatus;

    return matchesSearch && matchesStatus;
  });

  // KPI Statistics
  const totalUnits = seliaItems.length;
  const countBelum = seliaItems.filter(i => i.seliaStatus === 'Belum Diselia').length;
  const countProses = seliaItems.filter(i => i.seliaStatus === 'Sedang Proses Selia').length;
  const countCetak = seliaItems.filter(i => i.seliaStatus === 'Sudah Cetak Sertifikat').length;
  const percentCetak = totalUnits > 0 ? Math.round((countCetak / totalUnits) * 100) : 0;

  const showSavedToast = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 2500);
  };

  // Update a single unit's selia status
  const handleSeliaStatusChange = (itemId: string, newStatus: SeliaStatus) => {
    const updatedItems = seliaItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          seliaStatus: newStatus,
          updatedAt: TODAY_STR
        };
      }
      return item;
    });

    const isAllCetak = updatedItems.every(i => i.seliaStatus === 'Sudah Cetak Sertifikat');

    const updatedSchedule: CalibrationSchedule = {
      ...activeSchedule,
      seliaItems: updatedItems,
      status: isAllCetak ? 'Sertifikat Terbit' : 'Selesai Kalibrasi'
    };

    onUpdateSchedule(updatedSchedule);
    showSavedToast(`Status alat berhasil diperbarui menjadi "${newStatus}"`);
  };

  // Update a single unit's keterangan free-text
  const handleKeteranganChange = (itemId: string, newKeterangan: string) => {
    const updatedItems = seliaItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          keterangan: newKeterangan,
          updatedAt: TODAY_STR
        };
      }
      return item;
    });

    const updatedSchedule: CalibrationSchedule = {
      ...activeSchedule,
      seliaItems: updatedItems
    };

    onUpdateSchedule(updatedSchedule);
  };

  // Batch action: set all to a status
  const handleBatchSetStatus = (targetStatus: SeliaStatus) => {
    const updatedItems = seliaItems.map(item => ({
      ...item,
      seliaStatus: targetStatus,
      updatedAt: TODAY_STR
    }));

    const isAllCetak = targetStatus === 'Sudah Cetak Sertifikat';

    const updatedSchedule: CalibrationSchedule = {
      ...activeSchedule,
      seliaItems: updatedItems,
      status: isAllCetak ? 'Sertifikat Terbit' : 'Selesai Kalibrasi'
    };

    onUpdateSchedule(updatedSchedule);
    showSavedToast(`Semua ${totalUnits} unit alat berhasil diset ke "${targetStatus}"`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Saved Notification */}
      {savedNotice && (
        <div className="fixed bottom-5 right-5 bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2 text-xs border border-emerald-400 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Top Banner & Project Selector */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 p-5 rounded-2xl border border-slate-800 shadow-lg text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <FileCheck className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  Update Perkembangan Setelah Kalibrasi Selesai
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Proses Selia, Pengesahan Manajer Teknik, & Monitoring Cetak Sertifikat Per Unit Alat Medis
                </p>
              </div>
            </div>
          </div>

          {/* Selector RS / SPK Work Order */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-700">
            <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-400 shrink-0">Pilih RS / SPK:</span>
            <select
              value={selectedScheduleId}
              onChange={(e) => setSelectedScheduleId(e.target.value)}
              className="bg-slate-900 text-cyan-300 font-bold text-xs px-3 py-1.5 rounded-lg border border-cyan-500/30 focus:outline-none focus:border-cyan-400 w-full max-w-xs"
            >
              {schedules.map((sch) => (
                <option key={sch.id} value={sch.id}>
                  {sch.hospitalName} ({sch.workOrderNumber}) - {sch.status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Hospital Info Header */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Rumah Sakit / Faskes</span>
            <span className="font-bold text-white text-xs truncate block">{activeSchedule.hospitalName}</span>
            <span className="text-[10px] text-cyan-400 font-mono">{activeSchedule.workOrderNumber}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Tanggal Kalibrasi Lapangan</span>
            <span className="font-bold text-white text-xs block">{formatIndonesianDate(activeSchedule.scheduledDate)}</span>
            <span className="text-[10px] text-slate-400">Teknisi: {activeSchedule.leadTechnicianName}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Kode Label RS / Range</span>
            <span className="font-bold text-amber-300 font-mono text-xs block">
              {activeSchedule.labelRange || `${activeSchedule.hospitalCode || '100'}.0001 s/d ${activeSchedule.hospitalCode || '100'}.${String(totalUnits).padStart(4, '0')}`}
            </span>
            <span className="text-[10px] text-slate-400">Total {totalUnits} Unit Alat Medis</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Manajer Teknik Penanggung Jawab</span>
            <span className="font-bold text-emerald-400 text-xs block truncate">{activeSchedule.approvedByName || 'Hafizh Pasifianto, S.Tr.T.'}</span>
            <span className="text-[10px] text-slate-400">LK-532-IDN Certified</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards & Batch Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs block">Total Unit Dikalibrasi</span>
            <span className="text-2xl font-extrabold text-white font-mono">{totalUnits}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Itemized 1-per-1 Alat</span>
          </div>
          <div className="p-2.5 bg-slate-800 text-cyan-400 rounded-xl">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs block">Belum Diselia</span>
            <span className="text-2xl font-extrabold text-amber-400 font-mono">{countBelum}</span>
            <span className="text-[10px] text-amber-300/80 block mt-0.5">Perlu Peninjauan Selia</span>
          </div>
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs block">Sedang Proses Selia</span>
            <span className="text-2xl font-extrabold text-cyan-400 font-mono">{countProses}</span>
            <span className="text-[10px] text-cyan-300/80 block mt-0.5">Dalam Verifikasi Paraf</span>
          </div>
          <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs block">Sudah Cetak Sertifikat</span>
            <span className="text-2xl font-extrabold text-emerald-400 font-mono">{countCetak}</span>
            <span className="text-[10px] text-emerald-300/80 block mt-0.5">{percentCetak}% Selesai Sempurna</span>
          </div>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Quick Batch Bar & Search */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama alat, no seri, label, keterangan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterSeliaStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterSeliaStatus === 'all'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Semua ({totalUnits})
          </button>
          <button
            onClick={() => setFilterSeliaStatus('Belum Diselia')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterSeliaStatus === 'Belum Diselia'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Belum Diselia ({countBelum})
          </button>
          <button
            onClick={() => setFilterSeliaStatus('Sedang Proses Selia')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterSeliaStatus === 'Sedang Proses Selia'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Proses Selia ({countProses})
          </button>
          <button
            onClick={() => setFilterSeliaStatus('Sudah Cetak Sertifikat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterSeliaStatus === 'Sudah Cetak Sertifikat'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sudah Cetak ({countCetak})
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={() => handleBatchSetStatus('Sedang Proses Selia')}
            className="bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 font-bold px-3 py-1.5 rounded-xl transition-all"
          >
            Semua Proses Selia
          </button>
          <button
            onClick={() => handleBatchSetStatus('Sudah Cetak Sertifikat')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Semua Sudah Cetak</span>
          </button>
        </div>
      </div>

      {/* Main Itemized Table (Per Unit Alat) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-cyan-400" />
              Tabel Perkembangan Selia & Sertifikat Alat Medis (Rincian Unit 1-per-1)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Setiap unit alat medis disajikan secara terpisah untuk update status selia dan catatan keterangan individual.
            </p>
          </div>

          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 rounded-lg">
            Menampilkan {filteredItems.length} dari {totalUnits} Unit
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-12">No</th>
                <th className="py-3 px-4">Nama Alat Medis (Rincian Unit)</th>
                <th className="py-3 px-3">Merk / Model & No. Seri</th>
                <th className="py-3 px-3 text-center">No. Label Kalibrasi</th>
                <th className="py-3 px-3">Ruang / Lokasi</th>
                <th className="py-3 px-3 text-center">Hasil Uji Lapangan</th>
                <th className="py-3 px-3 w-48">Status Proses Selia & Cetak</th>
                <th className="py-3 px-4 text-left min-w-[200px]">Keterangan (Catatan Bebas)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Tidak ditemukan data unit alat medis yang sesuai dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                      {/* No */}
                      <td className="py-3 px-3 text-center font-bold font-mono text-cyan-400/90 text-xs">
                        {item.unitNo || idx + 1}
                      </td>

                      {/* Nama Alat */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-xs">
                          {item.unitTitle || item.deviceName}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {item.deviceName}
                        </span>
                      </td>

                      {/* Merk & Serial Number */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-300 block">{item.brandModel || '-'}</span>
                        <span className="text-[10px] text-slate-500 font-mono block">SN: {item.serialNumber || '-'}</span>
                      </td>

                      {/* No. Label */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-500/30 inline-block">
                          {item.labelNumber || '-'}
                        </span>
                      </td>

                      {/* Ruang */}
                      <td className="py-3 px-3 text-slate-300 font-medium">
                        {item.room || 'Layanan RS'}
                      </td>

                      {/* Hasil Uji Lapangan */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Laik Pakai / Sudah Lulus Kalibrasi</span>
                        </span>
                      </td>

                      {/* Status Selia & Cetak Dropdown */}
                      <td className="py-3 px-3">
                        <select
                          value={item.seliaStatus}
                          onChange={(e) => handleSeliaStatusChange(item.id, e.target.value as SeliaStatus)}
                          className={`w-full text-xs font-bold px-2.5 py-1.5 rounded-xl border focus:outline-none transition-all ${
                            item.seliaStatus === 'Sudah Cetak Sertifikat'
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 focus:border-emerald-400'
                              : item.seliaStatus === 'Sedang Proses Selia'
                              ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 focus:border-cyan-400'
                              : 'bg-amber-950/80 text-amber-300 border-amber-500/50 focus:border-amber-400'
                          }`}
                        >
                          <option value="Belum Diselia">Belum Diselia</option>
                          <option value="Sedang Proses Selia">Sedang Proses Selia</option>
                          <option value="Sudah Cetak Sertifikat">Sudah Cetak Sertifikat</option>
                        </select>
                      </td>

                      {/* Keterangan Free Text Input Column */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Ketik keterangan bebas..."
                          value={item.keterangan || ''}
                          onChange={(e) => handleKeteranganChange(item.id, e.target.value)}
                          className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-cyan-400 text-white rounded-xl px-3 py-1.5 text-xs placeholder-slate-500 focus:outline-none shadow-inner"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Semua data selia tersimpan secara otomatis dan tersinkronisasi ke database.</span>
          </div>
          <p className="font-mono text-[11px] text-slate-500">
            Penyelia Teknis: Hafizh Pasifianto, S.Tr.T. | PT. Sarana Multi Kalibrasi
          </p>
        </div>
      </div>
    </div>
  );
};
