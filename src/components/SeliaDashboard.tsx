import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Building2, 
  FileCheck, 
  Printer, 
  SlidersHorizontal, 
  Filter, 
  Award, 
  Check, 
  Sparkles,
  FileText,
  RefreshCw,
  Tag
} from 'lucide-react';
import { CalibrationSchedule, DeviceSeliaItem, SeliaStatus } from '../types';
import { ensureDeviceSeliaItems, formatIndonesianDate, TODAY_STR } from '../utils/helpers';

interface SeliaDashboardProps {
  schedules: CalibrationSchedule[];
  onUpdateSchedule: (schedule: CalibrationSchedule) => void;
}

export const SeliaDashboard: React.FC<SeliaDashboardProps> = ({
  schedules,
  onUpdateSchedule
}) => {
  // 1. Specifically filter schedules that have been marked 'Sudah Selesai Kalibrasi' (or 'Sertifikat Terbit')
  const completedSchedules = schedules.filter(s => 
    s.status === 'Selesai Kalibrasi' || 
    s.status === 'Sertifikat Terbit' || 
    s.progressPercent === 100 ||
    !!s.completedDate
  );

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeliaStatus, setFilterSeliaStatus] = useState<string>('all');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // If no schedules are marked 'Sudah Selesai Kalibrasi'
  if (completedSchedules.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-400 my-4 shadow-xl">
        <div className="w-16 h-16 mx-auto bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">Belum Ada Jadwal "Sudah Selesai Kalibrasi"</h3>
        <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
          Dashboard ini khusus menampilkan daftar alat medis dari jadwal pekerjaan yang telah ditandai <strong className="text-emerald-400">"Selesai Kalibrasi"</strong>. 
          Silakan selesaikan kalibrasi pada menu <strong className="text-cyan-400">Penjadwalan RS</strong> terlebih dahulu.
        </p>
      </div>
    );
  }

  // Determine active schedules to show tools from
  const activeSchedules = selectedScheduleId === 'ALL'
    ? completedSchedules
    : completedSchedules.filter(s => s.id === selectedScheduleId);

  // Aggregate all individual tools from selected completed schedule(s)
  interface FlatToolItem {
    item: DeviceSeliaItem;
    schedule: CalibrationSchedule;
  }

  const allTools: FlatToolItem[] = [];
  activeSchedules.forEach(schedule => {
    const items = ensureDeviceSeliaItems(schedule);
    items.forEach(item => {
      allTools.push({ item, schedule });
    });
  });

  // Filter tools by search query & selia status
  const filteredTools = allTools.filter(({ item, schedule }) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      item.deviceName.toLowerCase().includes(query) ||
      item.unitTitle.toLowerCase().includes(query) ||
      item.brandModel.toLowerCase().includes(query) ||
      item.serialNumber.toLowerCase().includes(query) ||
      (item.labelNumber && item.labelNumber.toLowerCase().includes(query)) ||
      (item.keterangan && item.keterangan.toLowerCase().includes(query)) ||
      (item.room && item.room.toLowerCase().includes(query)) ||
      schedule.hospitalName.toLowerCase().includes(query);

    const matchesStatus = filterSeliaStatus === 'all' || item.seliaStatus === filterSeliaStatus;

    return matchesSearch && matchesStatus;
  });

  // Key KPI metrics across selected completed schedules
  const totalToolsCount = allTools.length;
  const countBelum = allTools.filter(t => t.item.seliaStatus === 'Belum Diselia').length;
  const countProses = allTools.filter(t => t.item.seliaStatus === 'Sedang Proses Selia').length;
  const countCetak = allTools.filter(t => t.item.seliaStatus === 'Sudah Cetak Sertifikat').length;
  const percentCetak = totalToolsCount > 0 ? Math.round((countCetak / totalToolsCount) * 100) : 0;

  const showToast = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 2500);
  };

  // Helper to update a tool's status mapped to its specific parent schedule
  const handleToolStatusChange = (targetItem: DeviceSeliaItem, parentSchedule: CalibrationSchedule, newStatus: SeliaStatus) => {
    const scheduleItems = ensureDeviceSeliaItems(parentSchedule);
    const updatedItems = scheduleItems.map(i => {
      if (i.id === targetItem.id) {
        return {
          ...i,
          seliaStatus: newStatus,
          updatedAt: TODAY_STR
        };
      }
      return i;
    });

    const isAllCetak = updatedItems.every(i => i.seliaStatus === 'Sudah Cetak Sertifikat');

    const updatedSchedule: CalibrationSchedule = {
      ...parentSchedule,
      seliaItems: updatedItems,
      status: isAllCetak ? 'Sertifikat Terbit' : 'Selesai Kalibrasi'
    };

    onUpdateSchedule(updatedSchedule);
    showToast(`Status "${targetItem.unitTitle || targetItem.deviceName}" diubah ke "${newStatus}"`);
  };

  // Helper to update notes/keterangan mapped per individual tool
  const handleToolNotesChange = (targetItem: DeviceSeliaItem, parentSchedule: CalibrationSchedule, newNotes: string) => {
    const scheduleItems = ensureDeviceSeliaItems(parentSchedule);
    const updatedItems = scheduleItems.map(i => {
      if (i.id === targetItem.id) {
        return {
          ...i,
          keterangan: newNotes,
          updatedAt: TODAY_STR
        };
      }
      return i;
    });

    const updatedSchedule: CalibrationSchedule = {
      ...parentSchedule,
      seliaItems: updatedItems
    };

    onUpdateSchedule(updatedSchedule);
  };

  // Batch action: set filtered tools to status
  const handleBatchSetStatus = (targetStatus: SeliaStatus) => {
    if (filteredTools.length === 0) return;

    // Group filtered tools by schedule ID
    const scheduleMap = new Map<string, { schedule: CalibrationSchedule; itemIds: Set<string> }>();
    filteredTools.forEach(({ item, schedule }) => {
      if (!scheduleMap.has(schedule.id)) {
        scheduleMap.set(schedule.id, { schedule, itemIds: new Set() });
      }
      scheduleMap.get(schedule.id)!.itemIds.add(item.id);
    });

    scheduleMap.forEach(({ schedule, itemIds }) => {
      const scheduleItems = ensureDeviceSeliaItems(schedule);
      const updatedItems = scheduleItems.map(i => {
        if (itemIds.has(i.id)) {
          return {
            ...i,
            seliaStatus: targetStatus,
            updatedAt: TODAY_STR
          };
        }
        return i;
      });

      const isAllCetak = updatedItems.every(i => i.seliaStatus === 'Sudah Cetak Sertifikat');

      const updatedSchedule: CalibrationSchedule = {
        ...schedule,
        seliaItems: updatedItems,
        status: isAllCetak ? 'Sertifikat Terbit' : 'Selesai Kalibrasi'
      };

      onUpdateSchedule(updatedSchedule);
    });

    showToast(`${filteredTools.length} alat medis berhasil diperbarui ke status "${targetStatus}"`);
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

      {/* Main Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 p-5 rounded-2xl border border-slate-800 shadow-xl text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <FileCheck className="w-6 h-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    Dashboard Selia & Sertifikat Alat Medis
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Filter: Selesai Kalibrasi
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Proses Selia, Pengesahan Manajer Teknik, dan Cetak Sertifikat dipetakan per individu unit alat medis.
                </p>
              </div>
            </div>
          </div>

          {/* Filter Dropdown RS / Work Order */}
          <div className="flex items-center gap-2 bg-slate-950/90 p-2 rounded-xl border border-slate-700">
            <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-400 shrink-0">Pilih Faskes / RS:</span>
            <select
              value={selectedScheduleId}
              onChange={(e) => setSelectedScheduleId(e.target.value)}
              className="bg-slate-900 text-cyan-300 font-bold text-xs px-3 py-1.5 rounded-lg border border-cyan-500/30 focus:outline-none focus:border-cyan-400 w-full max-w-xs cursor-pointer"
            >
              <option value="ALL">Semua RS Selesai Kalibrasi ({completedSchedules.length} RS)</option>
              {completedSchedules.map((sch) => (
                <option key={sch.id} value={sch.id}>
                  {sch.hospitalName} ({sch.workOrderNumber})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Scope Summary */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Cakupan Faskes / RS</span>
            <span className="font-bold text-white text-xs truncate block">
              {selectedScheduleId === 'ALL' ? `Semua RS (${completedSchedules.length} RS)` : activeSchedules[0]?.hospitalName}
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">
              {selectedScheduleId === 'ALL' ? 'Total Selia Terintegrasi' : activeSchedules[0]?.workOrderNumber}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Total Unit Alat Medis</span>
            <span className="font-bold text-amber-300 text-xs block font-mono">{totalToolsCount} Unit Alat</span>
            <span className="text-[10px] text-slate-400">Terdaftar 1-per-1</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Progres Sertifikat Terbit</span>
            <span className="font-bold text-emerald-400 text-xs block">{percentCetak}% Selesai</span>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
              <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${percentCetak}%` }}></div>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Manajer Teknik Penanggung Jawab</span>
            <span className="font-bold text-cyan-300 text-xs block truncate">Hafizh Pasifianto, S.Tr.T.</span>
            <span className="text-[10px] text-slate-400">Otorisasi LK-532-IDN</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-slate-400 text-xs block">Total Unit Dikalibrasi</span>
            <span className="text-2xl font-extrabold text-white font-mono">{totalToolsCount}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Selia dipetakan per alat</span>
          </div>
          <div className="p-2.5 bg-slate-800 text-cyan-400 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-slate-400 text-xs block">Belum Selia</span>
            <span className="text-2xl font-extrabold text-amber-400 font-mono">{countBelum}</span>
            <span className="text-[10px] text-amber-300/80 block mt-0.5">Menunggu peninjauan</span>
          </div>
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-slate-400 text-xs block">Proses Selia</span>
            <span className="text-2xl font-extrabold text-cyan-400 font-mono">{countProses}</span>
            <span className="text-[10px] text-cyan-300/80 block mt-0.5">Sedang diverifikasi MT</span>
          </div>
          <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-slate-400 text-xs block">Cetak Sertifikat</span>
            <span className="text-2xl font-extrabold text-emerald-400 font-mono">{countCetak}</span>
            <span className="text-[10px] text-emerald-300/80 block mt-0.5">{percentCetak}% Siap Diserahkan</span>
          </div>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Status Filter & Batch Actions */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari alat, no. seri, label, ruang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterSeliaStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterSeliaStatus === 'all'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Semua ({totalToolsCount})
          </button>
          <button
            onClick={() => setFilterSeliaStatus('Belum Diselia')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterSeliaStatus === 'Belum Diselia'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Belum Selia ({countBelum})
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
            Cetak Sertifikat ({countCetak})
          </button>
        </div>

        {/* Batch Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={() => handleBatchSetStatus('Sedang Proses Selia')}
            className="bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 font-bold px-3 py-1.5 rounded-xl transition-all"
          >
            Set Terpilih: Proses Selia
          </button>
          <button
            onClick={() => handleBatchSetStatus('Sudah Cetak Sertifikat')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Set Terpilih: Cetak Sertifikat</span>
          </button>
        </div>
      </div>

      {/* Main Tools Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Award className="w-4.5 h-4.5 text-cyan-400" />
              Daftar Alat Medis (Proses Selia & Sertifikat Individual)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Klik tombol status ('Belum Selia', 'Proses Selia', 'Cetak Sertifikat') dan isi catatan langsung per individu unit alat.
            </p>
          </div>

          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-3 py-1 rounded-lg">
            Menampilkan {filteredTools.length} dari {totalToolsCount} Unit Alat
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-3 text-center w-12">No</th>
                <th className="py-3.5 px-4">Nama Alat Medis & Faskes</th>
                <th className="py-3.5 px-3">Merk / Model & No. Seri</th>
                <th className="py-3.5 px-3 text-center">No. Label</th>
                <th className="py-3.5 px-3">Ruang / Lokasi</th>
                <th className="py-3.5 px-4 text-center min-w-[280px]">Status Selia Individual</th>
                <th className="py-3.5 px-4 text-left min-w-[220px]">Catatan / Keterangan Alat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900">
              {filteredTools.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    Tidak ditemukan data alat medis dari jadwal selesai kalibrasi.
                  </td>
                </tr>
              ) : (
                filteredTools.map(({ item, schedule }, idx) => {
                  const isBelum = item.seliaStatus === 'Belum Diselia';
                  const isProses = item.seliaStatus === 'Sedang Proses Selia';
                  const isCetak = item.seliaStatus === 'Sudah Cetak Sertifikat';

                  return (
                    <tr key={`${schedule.id}-${item.id}`} className="hover:bg-slate-800/40 transition-colors">
                      {/* No */}
                      <td className="py-3.5 px-3 text-center font-bold font-mono text-cyan-400/90 text-xs">
                        {idx + 1}
                      </td>

                      {/* Nama Alat & RS */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-xs">
                          {item.unitTitle || item.deviceName}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 mt-0.5">
                          <Building2 className="w-3 h-3 shrink-0 text-cyan-500" />
                          <span className="truncate font-medium">{schedule.hospitalName}</span>
                          <span className="text-slate-500">({schedule.workOrderNumber})</span>
                        </div>
                      </td>

                      {/* Merk & Serial Number */}
                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-slate-300 block">{item.brandModel || '-'}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">SN: {item.serialNumber || '-'}</span>
                      </td>

                      {/* Label Number */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-500/30 inline-block">
                          {item.labelNumber || '-'}
                        </span>
                      </td>

                      {/* Ruang */}
                      <td className="py-3.5 px-3 text-slate-300 font-medium">
                        {item.room || 'Layanan RS'}
                      </td>

                      {/* Status Buttons for 'Belum Selia', 'Proses Selia', 'Cetak Sertifikat' */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex p-1 bg-slate-950 rounded-xl border border-slate-800 gap-1 w-full max-w-xs">
                          {/* Button 1: Belum Selia */}
                          <button
                            onClick={() => handleToolStatusChange(item, schedule, 'Belum Diselia')}
                            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                              isBelum
                                ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-400'
                                : 'text-slate-400 hover:text-amber-300 hover:bg-slate-900'
                            }`}
                            title="Tandai Belum Selia"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Belum Selia</span>
                          </button>

                          {/* Button 2: Proses Selia */}
                          <button
                            onClick={() => handleToolStatusChange(item, schedule, 'Sedang Proses Selia')}
                            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                              isProses
                                ? 'bg-cyan-500 text-slate-950 shadow-md ring-1 ring-cyan-400'
                                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900'
                            }`}
                            title="Tandai Proses Selia"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>Proses Selia</span>
                          </button>

                          {/* Button 3: Cetak Sertifikat */}
                          <button
                            onClick={() => handleToolStatusChange(item, schedule, 'Sudah Cetak Sertifikat')}
                            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                              isCetak
                                ? 'bg-emerald-500 text-slate-950 shadow-md ring-1 ring-emerald-400'
                                : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900'
                            }`}
                            title="Tandai Cetak Sertifikat"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Cetak Sertifikat</span>
                          </button>
                        </div>
                      </td>

                      {/* Notes / Catatan Input Mapped Per Individual Tool */}
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          placeholder="Tambahkan catatan alat..."
                          value={item.keterangan || ''}
                          onChange={(e) => handleToolNotesChange(item, schedule, e.target.value)}
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
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Perubahan status & catatan tersimpan otomatis per unit alat medis.</span>
          </div>
          <p className="font-mono text-[11px] text-slate-500">
            Penanggung Jawab: Hafizh Pasifianto, S.Tr.T. (MT PT. Sarana Multi Kalibrasi)
          </p>
        </div>
      </div>
    </div>
  );
};
