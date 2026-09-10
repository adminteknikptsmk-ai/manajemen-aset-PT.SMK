import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardOverview } from './components/DashboardOverview';
import { ScheduleManager } from './components/ScheduleManager';
import { CalibratorAssetManager } from './components/CalibratorAssetManager';
import { FinancialAssetManager } from './components/FinancialAssetManager';
import { MasterHospitalAndTech } from './components/MasterHospitalAndTech';
import { WorkOrderDetailModal } from './components/WorkOrderDetailModal';
import { ScheduleFormModal } from './components/ScheduleFormModal';
import { SpkFormModal } from './components/SpkFormModal';
import { WorkOrderPrintModal } from './components/WorkOrderPrintModal';
import { SphManager } from './components/SphManager';
import { SphFormModal } from './components/SphFormModal';
import { SphPrintModal } from './components/SphPrintModal';
import { TabletLoanManager } from './components/TabletLoanManager';
import { TemplateSettings } from './components/TemplateSettings';

import { motion, AnimatePresence } from 'motion/react';

import { 
  CalibrationSchedule, 
  CalibratorAsset, 
  CalibratorLoan,
  FinancialAsset, 
  FinancialTransaction, 
  Hospital, 
  Technician,
  MarketingStaff,
  SphQuotation,
  TabletDevice,
  TabletLoan
} from './types';

import { getUrgencyInfo, generateWhatsAppMessage, TODAY_STR, calculateLabelRange, assignDeviceLabels } from './utils/helpers';
import { SPREADSHEET_CALIBRATORS, OFFICIAL_TABLETS } from './data/spreadsheetCalibrators';
import confetti from 'canvas-confetti';
import { Check, Send, AlertCircle, ArrowLeft, LogOut } from 'lucide-react';
import { useFirestoreData } from './firebase/useFirestoreData';
import { useAuth } from './firebase/AuthContext';

export default function App() {
  const { user, isAdmin, logout } = useAuth();
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sph' | 'schedules' | 'calibrators' | 'tablets' | 'financial' | 'masters' | 'templates'>('dashboard');
  const [slideDirection, setSlideDirection] = useState<number>(1);

  const handleSelectCoreSlide = (newTab: 'dashboard' | 'sph' | 'schedules') => {
    const order: Record<string, number> = { dashboard: 0, sph: 1, schedules: 2 };
    const currentIdx = order[activeTab] ?? 0;
    const newIdx = order[newTab] ?? 0;
    setSlideDirection(newIdx >= currentIdx ? 1 : -1);
    setActiveTab(newTab);
  };

  // Persistence State via Firestore
  const { data: schedules, add: addSchedule, update: updateSchedule, remove: removeSchedule, clearAll: clearAllSchedules } = useFirestoreData<CalibrationSchedule>('schedules');
  const { data: sphList, add: addSph, update: updateSph, remove: removeSph, clearAll: clearAllSph } = useFirestoreData<SphQuotation>('sphDocuments');
  const { data: calibrators, add: addCalibrator, update: updateCalibrator, remove: removeCalibrator, clearAll: clearAllCalibrators } = useFirestoreData<CalibratorAsset>('calibratorAssets');
  const { data: financialAssets, add: addFinancialAsset, remove: removeFinancialAsset, clearAll: clearAllFinancialAssets } = useFirestoreData<FinancialAsset>('financialAssets');
  const { data: transactions, add: addTransaction, remove: removeTransaction, clearAll: clearAllTransactions } = useFirestoreData<FinancialTransaction>('financialTransactions');
  const { data: hospitals, add: addHospital, update: updateHospital, remove: removeHospital, clearAll: clearAllHospitals } = useFirestoreData<Hospital>('hospitals');
  const { data: technicians, add: addTechnician, update: updateTechnician, remove: removeTechnician, clearAll: clearAllTechnicians } = useFirestoreData<Technician>('technicians');
  const { data: tablets, add: addTablet, update: updateTablet, remove: removeTablet, clearAll: clearAllTablets } = useFirestoreData<TabletDevice>('tabletAssets');
  const { data: tabletLoans, add: addTabletLoan, update: updateTabletLoanDb, remove: removeTabletLoanDb, clearAll: clearAllTabletLoans } = useFirestoreData<TabletLoan>('tabletLoans');
  const { data: marketingList, add: addMarketing, remove: removeMarketing, clearAll: clearAllMarketing } = useFirestoreData<MarketingStaff>('marketingStaff');

  // Fallback to official 57 calibrators and 6 tablets if database collection is empty
  const effectiveCalibrators = calibrators.length > 0 ? calibrators : SPREADSHEET_CALIBRATORS;
  const effectiveTablets = tablets.length > 0 ? tablets : OFFICIAL_TABLETS;

  const handleSyncOfficialCalibrators = async () => {
    try {
      for (const cal of SPREADSHEET_CALIBRATORS) {
        await addCalibrator(cal);
      }
      showToast('57 Aset Alat Kalibrator Master Resmi berhasil disinkronkan ke database!');
    } catch (e) {
      console.error('Error syncing calibrators:', e);
      showToast('Gagal menyinkronkan data kalibrator.');
    }
  };

  const handleSyncOfficialTablets = async () => {
    try {
      for (const tab of OFFICIAL_TABLETS) {
        await addTablet(tab);
      }
      showToast('6 Unit Tablet Kalibrasi resmi berhasil disinkronkan ke database!');
    } catch (e) {
      console.error('Error syncing tablets:', e);
      showToast('Gagal menyinkronkan data tablet.');
    }
  };

  const handlePurgeAllData = async () => {
    try {
      await Promise.all([
        clearAllSchedules(),
        clearAllSph(),
        clearAllCalibrators(),
        clearAllFinancialAssets(),
        clearAllTransactions(),
        clearAllHospitals(),
        clearAllTechnicians(),
        clearAllTablets(),
        clearAllTabletLoans(),
        clearAllMarketing()
      ]);
      showToast('Seluruh database telah dikosongkan secara permanen. Sistem kini bersih 0 data.');
    } catch (e) {
      console.error('Error purging data:', e);
      showToast('Terjadi kesalahan saat mengosongkan data.');
    }
  };

  // Modal States
  const [selectedSchedule, setSelectedSchedule] = useState<CalibrationSchedule | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<CalibrationSchedule | null>(null);
  const [printSchedule, setPrintSchedule] = useState<CalibrationSchedule | null>(null);
  const [showNewScheduleModal, setShowNewScheduleModal] = useState(false);
  const [showSpkModal, setShowSpkModal] = useState(false);
  const [spkEditingSchedule, setSpkEditingSchedule] = useState<CalibrationSchedule | null>(null);

  useEffect(() => {
    const handleLogout = () => {
      logout();
    };
    window.addEventListener('app:logout', handleLogout as EventListener);
    return () => window.removeEventListener('app:logout', handleLogout as EventListener);
  }, [logout]);

  // SPH Modal States
  const [showSphModal, setShowSphModal] = useState(false);
  const [editingSph, setEditingSph] = useState<SphQuotation | null>(null);
  const [printSph, setPrintSph] = useState<SphQuotation | null>(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to ensure an approved/deal SPH enters calibration scheduling
  const syncSphToSchedule = (sph: SphQuotation) => {
    // Check if schedule for this SPH already exists
    const existingSch = schedules.find(s => 
      s.notes?.includes(sph.sphNumber) || s.hospitalName.toLowerCase() === sph.hospitalName.toLowerCase()
    );

    if (existingSch) {
      return existingSch;
    }

    // Default hospital code: 062
    const hospitalCode = '062';
    const totalUnits = sph.items.reduce((sum, it) => sum + (it.quantity || 1), 0);
    const labelRange = calculateLabelRange(hospitalCode, 1, Math.max(1, totalUnits));

    const targetDevicesWithLabels = assignDeviceLabels(
      sph.items.map((it, idx) => ({
        id: `dev-${idx + 1}-${Date.now()}`,
        name: it.description,
        quantity: it.quantity,
        room: 'Ruang Kalibrasi RS',
        brandModel: '-',
        serialNumber: '-',
        status: 'Pending' as const,
        notes: it.notes || ''
      })),
      hospitalCode,
      1
    );

    const newSchedule: CalibrationSchedule = {
      id: `SCH-${Date.now().toString().slice(-6)}`,
      workOrderNumber: `SPK/SMK/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${Math.floor(100 + Math.random() * 900)}`,
      hospitalId: sph.hospitalId || `RS-${Date.now().toString().slice(-4)}`,
      hospitalCode,
      hospitalName: sph.hospitalName,
      hospitalAddress: sph.hospitalAddress,
      hospitalCity: sph.city || 'Surakarta',
      hospitalPic: sph.hospitalPic || 'Ka. IPSRS',
      hospitalPhone: sph.hospitalPhone || '0812-3456-7890',
      scheduledDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      leadTechnicianId: technicians[0]?.id || 'TECH-001',
      leadTechnicianName: technicians[0]?.name || 'Shifa Zalza Billa',
      supportTechnicianIds: [technicians[1]?.id || 'TECH-002'],
      supportTechnicianNames: [technicians[1]?.name || 'Sheva Maresca Pramuningtyas'],
      marketingName: sph.marketingStaffName || 'Erwin',
      labelStart: labelRange.startLabel,
      labelEnd: labelRange.endLabel,
      labelRange: labelRange.displayRange,
      labelSequenceStart: 1,
      targetDevices: targetDevicesWithLabels,
      assignedCalibratorIds: ['CAL-001', 'CAL-002'],
      assignedCalibratorNames: ['Fluke ESA620 Electrical Safety', 'Fluke ProSim 8 Vital Signs'],
      priority: 'Tinggi',
      status: 'Dijadwalkan',
      estimatedHours: 16,
      contractValue: sph.grandTotal,
      progressPercent: 0,
      createdAt: TODAY_STR,
      remindersSentCount: 0,
      notes: `Otomatis dijadwalkan dari SPH Deal No. ${sph.sphNumber}. Label teralokasi: ${labelRange.displayRange}. Nilai Kontrak: Rp ${sph.grandTotal.toLocaleString('id-ID')}`
    };

    addSchedule(newSchedule);
    return newSchedule;
  };

  // SPH Handlers
  const handleSaveSph = (sphToSave: SphQuotation) => {
    const exists = sphList.some(s => s.id === sphToSave.id);
    if (exists) {
      updateSph(sphToSave);
      showToast(`Surat Penawaran Harga ${sphToSave.sphNumber} berhasil diperbarui!`);
    } else {
      addSph(sphToSave);
      showToast(`SPH ${sphToSave.sphNumber} untuk ${sphToSave.hospitalName} berhasil diterbitkan!`);
      confetti({ particleCount: 75, spread: 65 });
    }

    if (sphToSave.status === 'Disetujui (Deal)') {
      syncSphToSchedule(sphToSave);
    }
  };

  const handleUpdateSphStatus = (sphId: string, newStatus: SphQuotation['status']) => {
    const targetSph = sphList.find(s => s.id === sphId);
    if (!targetSph) return;

    const updatedSph: SphQuotation = {
      ...targetSph,
      status: newStatus
    };

    updateSph(updatedSph);

    if (newStatus === 'Disetujui (Deal)') {
      syncSphToSchedule(updatedSph);
      showToast(`SPH ${targetSph.sphNumber} Disetujui (Deal)! Otomatis masuk ke Penjadwalan Kalibrasi RS.`);
      confetti({ particleCount: 75, spread: 65 });
    } else {
      showToast(`Status SPH ${targetSph.sphNumber} berhasil diubah menjadi "${newStatus}".`);
    }
  };

  const handleDeleteSph = (sphId: string) => {
    removeSph(sphId);
    showToast('Surat Penawaran Harga telah dihapus.');
  };

  // Convert Approved SPH directly into a SPK (Work Order)
  const handleConvertToSpkFromSph = (sph: SphQuotation) => {
    const newScheduleFromSph: CalibrationSchedule = {
      id: `SCH-${Date.now().toString().slice(-6)}`,
      workOrderNumber: `WO/SPK/2026/${Math.floor(100 + Math.random() * 900)}`,
      hospitalId: sph.hospitalId || 'HOSP-001',
      hospitalName: sph.hospitalName,
      hospitalAddress: sph.hospitalAddress,
      hospitalCity: sph.city || 'Surakarta',
      hospitalPic: sph.hospitalPic || 'Ka. IPSRS',
      hospitalPhone: sph.hospitalPhone || '0812-3456-7890',
      scheduledDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      leadTechnicianId: technicians[0]?.id || 'TECH-001',
      leadTechnicianName: technicians[0]?.name || 'Shifa Zalza Billa',
      supportTechnicianIds: [technicians[1]?.id || 'TECH-002'],
      supportTechnicianNames: [technicians[1]?.name || 'Sheva Maresca Pramuningtyas'],
      targetDevices: sph.items.map((it, idx) => ({
        id: `dev-${idx + 1}-${Date.now()}`,
        name: it.description,
        quantity: it.quantity,
        room: 'Ruang Kalibrasi Medis RS',
        brandModel: '-',
        serialNumber: '-',
        status: 'Pending',
        notes: it.notes || ''
      })),
      assignedCalibratorIds: ['CAL-001', 'CAL-002'],
      assignedCalibratorNames: ['Fluke ESA620 Electrical Safety', 'Fluke ProSim 8 Vital Signs'],
      priority: 'Tinggi',
      status: 'Dijadwalkan',
      estimatedHours: 16,
      contractValue: sph.grandTotal,
      progressPercent: 0,
      createdAt: TODAY_STR,
      remindersSentCount: 0,
      notes: `Dibuat otomatis dari Surat Penawaran Harga (SPH) No. ${sph.sphNumber}. Nilai deal: Rp ${sph.grandTotal.toLocaleString('id-ID')}`
    };

    setSpkEditingSchedule(newScheduleFromSph);
    setShowSpkModal(true);
    showToast(`Data dari SPH ${sph.sphNumber} siap diterbitkan menjadi SPK!`);
  };

  // Schedule & SPK Handlers
  const handleSaveSchedule = (scheduleToSave: CalibrationSchedule) => {
    const exists = schedules.some(s => s.id === scheduleToSave.id);
    if (exists) {
      updateSchedule(scheduleToSave);
      showToast(`Jadwal kalibrasi ${scheduleToSave.hospitalName} berhasil diperbarui!`);
    } else {
      addSchedule(scheduleToSave);
      showToast(`Jadwal kalibrasi baru di ${scheduleToSave.hospitalName} berhasil dibuat!`);
      confetti({ particleCount: 70, spread: 60 });
    }
  };

  const handleSaveSpk = (scheduleToSave: CalibrationSchedule, andPrint: boolean = false) => {
    const exists = schedules.some(s => s.id === scheduleToSave.id);
    if (exists) {
      updateSchedule(scheduleToSave);
      showToast(`Surat Perintah Kerja (SPK) untuk ${scheduleToSave.hospitalName} berhasil disimpan!`);
    } else {
      addSchedule(scheduleToSave);
      showToast(`SPK baru untuk ${scheduleToSave.hospitalName} berhasil diterbitkan!`);
      confetti({ particleCount: 80, spread: 70 });
    }

    if (andPrint) {
      setPrintSchedule(scheduleToSave);
    }
  };

  const handleOpenSpkModal = (schedule?: CalibrationSchedule) => {
    setSpkEditingSchedule(schedule || null);
    setShowSpkModal(true);
  };

  const handleUpdateSingleSchedule = (updated: CalibrationSchedule) => {
    updateSchedule(updated);
    if (selectedSchedule?.id === updated.id) {
      setSelectedSchedule(updated);
    }
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    removeSchedule(scheduleId);
    showToast('Jadwal kalibrasi telah dihapus.');
  };

  // Automated Reminder Trigger Handler
  const handleSendAutomatedReminder = (schedule: CalibrationSchedule) => {
    const urgency = getUrgencyInfo(schedule, TODAY_STR);
    const msg = generateWhatsAppMessage(schedule, urgency);

    navigator.clipboard.writeText(msg);

    const updated: CalibrationSchedule = {
      ...schedule,
      remindersSentCount: (schedule.remindersSentCount || 0) + 1,
      lastReminderSentAt: '2026-08-30 08:30 (WhatsApp Otomatis)'
    };
    handleUpdateSingleSchedule(updated);

    showToast(`Pengingat otomatis untuk ${schedule.hospitalName} disiapkan! Format WhatsApp disalin ke clipboard.`);
  };

  // Quick Schedule from Hospital Master
  const handleQuickCreateScheduleForHospital = (hospital: Hospital) => {
    const newSch: CalibrationSchedule = {
      id: `SCH-${Date.now().toString().slice(-6)}`,
      workOrderNumber: `WO/KAL/2026/09/${Math.floor(100 + Math.random() * 900)}`,
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      hospitalCity: hospital.city,
      hospitalPic: hospital.picName,
      hospitalPhone: hospital.picPhone,
      scheduledDate: '2026-09-05',
      endDate: '2026-09-06',
      leadTechnicianId: technicians[0].id,
      leadTechnicianName: technicians[0].name,
      supportTechnicianIds: [technicians[1].id],
      supportTechnicianNames: [technicians[1].name],
      targetDevices: [
        { id: 'd-1', name: 'Defibrillator Biphasic', quantity: 2, room: 'IGD', brandModel: 'Philips', serialNumber: 'SN-DFB-01', status: 'Pending' },
        { id: 'd-2', name: 'Syringe Pump Terumo', quantity: 4, room: 'ICU', brandModel: 'Terumo', serialNumber: 'SN-SYR-01', status: 'Pending' }
      ],
      assignedCalibratorIds: ['CAL-001', 'CAL-004'],
      assignedCalibratorNames: ['Fluke ESA620', 'Fluke Impulse 7000DP'],
      priority: 'Tinggi',
      status: 'Dijadwalkan',
      estimatedHours: 12,
      contractValue: 28000000,
      progressPercent: 0,
      createdAt: TODAY_STR,
      remindersSentCount: 0
    };

    addSchedule(newSch);
    setActiveTab('schedules');
    showToast(`Jadwal kalibrasi untuk ${hospital.name} berhasil ditambahkan ke antrian!`);
  };

  // Tablet Loan Handlers (Tracking 6 Calibration Tablets)
  const handleAddTabletLoan = (newLoan: TabletLoan) => {
    const nextNo = tabletLoans.length + 1;
    const loanWithNo = { ...newLoan, no: nextNo };
    addTabletLoan(loanWithNo);

    const targetTablet = effectiveTablets.find(t => t.id === newLoan.tabletId);
    if (targetTablet) {
      const updatedTablet: TabletDevice = {
        ...targetTablet,
        isAvailable: false,
        currentBorrower: newLoan.borrowerName,
        currentLoanId: newLoan.id
      };
      if (tablets.some(t => t.id === targetTablet.id)) {
        updateTablet(updatedTablet);
      } else {
        addTablet(updatedTablet);
      }
    }

    showToast(`Peminjaman ${newLoan.tabletName} oleh ${newLoan.borrowerName} berhasil dicatat!`);
    confetti({ particleCount: 60, spread: 50 });
  };

  const handleUpdateTabletLoan = (updatedLoan: TabletLoan) => {
    updateTabletLoanDb(updatedLoan);

    const targetTablet = effectiveTablets.find(t => t.id === updatedLoan.tabletId);
    if (targetTablet) {
      const isAvailable = updatedLoan.status === 'Dikembalikan';
      const updatedTablet: TabletDevice = {
        ...targetTablet,
        isAvailable,
        currentBorrower: isAvailable ? undefined : updatedLoan.borrowerName,
        currentLoanId: isAvailable ? undefined : updatedLoan.id
      };
      if (tablets.some(t => t.id === targetTablet.id)) {
        updateTablet(updatedTablet);
      } else {
        addTablet(updatedTablet);
      }
    }

    showToast(`Data peminjaman ${updatedLoan.tabletName} telah diperbarui.`);
  };

  const handleDeleteTabletLoan = (loanId: string) => {
    const loan = tabletLoans.find(l => l.id === loanId);
    removeTabletLoanDb(loanId);

    if (loan && loan.status === 'Dipinjam') {
      const targetTablet = effectiveTablets.find(t => t.id === loan.tabletId);
      if (targetTablet) {
        const updatedTablet: TabletDevice = {
          ...targetTablet,
          isAvailable: true,
          currentBorrower: undefined,
          currentLoanId: undefined
        };
        if (tablets.some(t => t.id === targetTablet.id)) {
          updateTablet(updatedTablet);
        } else {
          addTablet(updatedTablet);
        }
      }
    }

    showToast('Data peminjaman tablet telah dihapus.');
  };

  const handleReturnTablet = (
    loanOrTabletId: string, 
    returnDate: string = TODAY_STR, 
    conditionNotes: string = 'Sangat Baik & Lengkap'
  ) => {
    const loan = tabletLoans.find(l => l.id === loanOrTabletId || (l.tabletId === loanOrTabletId && l.status === 'Dipinjam'));
    const targetTabletId = loan ? loan.tabletId : loanOrTabletId;
    const targetTablet = effectiveTablets.find(t => t.id === targetTabletId);

    if (loan) {
      const updatedLoan: TabletLoan = {
        ...loan,
        status: 'Dikembalikan',
        actualReturnDate: returnDate,
        returnedCondition: conditionNotes
      };
      updateTabletLoanDb(updatedLoan);
    }

    if (targetTablet) {
      const updatedTablet: TabletDevice = {
        ...targetTablet,
        isAvailable: true,
        currentBorrower: undefined,
        currentLoanId: undefined
      };
      if (tablets.some(t => t.id === targetTablet.id)) {
        updateTablet(updatedTablet);
      } else {
        addTablet(updatedTablet);
      }
    }

    const tabletName = targetTablet?.name || loan?.tabletName || 'Tablet';
    showToast(`Tablet ${tabletName} berhasil dikembalikan dan berstatus Tersedia di rak!`);
    confetti({ particleCount: 50, spread: 45 });
  };

  const handleUpdateTablet = (updatedTablet: TabletDevice) => {
    if (tablets.some(t => t.id === updatedTablet.id)) {
      updateTablet(updatedTablet);
    } else {
      addTablet(updatedTablet);
    }
    showToast(`Status tablet ${updatedTablet.name} berhasil diperbarui.`);
  };

  const handleToggleTabletStatus = (tabletId: string, targetAvailable?: boolean) => {
    const targetTablet = effectiveTablets.find(t => t.id === tabletId);
    if (!targetTablet) return;

    const newIsAvailable = targetAvailable !== undefined ? targetAvailable : !targetTablet.isAvailable;
    const updatedTablet: TabletDevice = {
      ...targetTablet,
      isAvailable: newIsAvailable,
      currentBorrower: newIsAvailable ? undefined : (targetTablet.currentBorrower || 'Teknisi Elektromedis'),
      currentLoanId: newIsAvailable ? undefined : targetTablet.currentLoanId
    };

    if (tablets.some(t => t.id === targetTablet.id)) {
      updateTablet(updatedTablet);
    } else {
      addTablet(updatedTablet);
    }

    if (newIsAvailable) {
      const activeLoan = tabletLoans.find(l => l.tabletId === tabletId && l.status === 'Dipinjam');
      if (activeLoan) {
        updateTabletLoanDb({
          ...activeLoan,
          status: 'Dikembalikan',
          actualReturnDate: TODAY_STR,
          returnedCondition: 'Dikembalikan ke rak lab'
        });
      }
    }

    showToast(`Status ${targetTablet.name} berhasil diubah menjadi "${newIsAvailable ? 'Tersedia di Rak' : 'Sedang Dipinjam'}".`);
  };

  return (
    <div className="min-h-screen bg-[#EEEEEE] text-[#1E293B] font-sans flex flex-col antialiased selection:bg-[#1C658C] selection:text-white">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        schedules={schedules}
        calibrators={effectiveCalibrators}
        sphCount={sphList.length}
        borrowedTabletsCount={effectiveTablets.filter(t => !t.isAvailable).length}
        onOpenNewSchedule={() => {
          setEditingSchedule(null);
          setShowNewScheduleModal(true);
        }}
        onOpenNewSph={() => {
          setEditingSph(null);
          setShowSphModal(true);
        }}
        onPurgeAllData={handlePurgeAllData}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 pb-12">
        {/* Main Application Views with Smooth Slide Transitions */}
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="slide-dashboard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <DashboardOverview
                schedules={schedules}
                calibrators={effectiveCalibrators}
                financialAssets={financialAssets}
                transactions={transactions}
                technicians={technicians}
                tablets={effectiveTablets}
                tabletLoans={tabletLoans}
                onSelectSchedule={(sch) => setSelectedSchedule(sch)}
                onNavigateToTab={(tab) => {
                  setActiveTab(tab as any);
                }}
                onOpenNewSchedule={() => {
                  setEditingSchedule(null);
                  setShowNewScheduleModal(true);
                }}
                onSendAutomatedReminder={handleSendAutomatedReminder}
              />
            </motion.div>
          )}

          {activeTab === 'sph' && (
            <motion.div
              key="slide-sph"
              initial={{ opacity: 0, x: slideDirection > 0 ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: slideDirection > 0 ? -30 : 30 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <SphManager
                sphList={sphList}
                onOpenNewSph={() => {
                  setEditingSph(null);
                  setShowSphModal(true);
                }}
                onEditSph={(sph) => {
                  setEditingSph(sph);
                  setShowSphModal(true);
                }}
                onPrintSph={(sph) => {
                  setPrintSph(sph);
                }}
                onDeleteSph={handleDeleteSph}
                onConvertToSpk={handleConvertToSpkFromSph}
                onUpdateStatus={handleUpdateSphStatus}
                onNavigateToSchedules={() => setActiveTab('schedules')}
                hospitals={hospitals}
              />
            </motion.div>
          )}

          {activeTab === 'schedules' && (
            <motion.div
              key="slide-schedules"
              initial={{ opacity: 0, x: slideDirection > 0 ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: slideDirection > 0 ? -30 : 30 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <ScheduleManager
                schedules={schedules}
                hospitals={hospitals}
                technicians={technicians}
                calibrators={effectiveCalibrators}
                onSelectSchedule={(sch) => setSelectedSchedule(sch)}
                onOpenNewScheduleModal={() => {
                  setEditingSchedule(null);
                  setShowNewScheduleModal(true);
                }}
                onOpenSpkModal={handleOpenSpkModal}
                onOpenEditScheduleModal={(sch) => {
                  setEditingSchedule(sch);
                  setShowNewScheduleModal(true);
                }}
                onOpenPrintModal={(sch) => setPrintSchedule(sch)}
                onSendReminder={handleSendAutomatedReminder}
                onDeleteSchedule={handleDeleteSchedule}
              />
            </motion.div>
          )}

          {activeTab === 'calibrators' && (
            <motion.div
              key="tab-calibrators"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <CalibratorAssetManager
                calibrators={effectiveCalibrators}
                technicians={technicians}
                onAddCalibrator={(newCal) => {
                  addCalibrator(newCal);
                  showToast(`Alat kalibrator ${newCal.code} berhasil ditambahkan!`);
                }}
                onUpdateCalibrator={(updated) => {
                  updateCalibrator(updated);
                  showToast(`Data kalibrator ${updated.code} telah diperbarui.`);
                }}
                onDeleteCalibrator={(calId) => {
                  removeCalibrator(calId);
                  showToast('Alat kalibrator berhasil dihapus.');
                }}
                onSyncOfficialCalibrators={handleSyncOfficialCalibrators}
              />
            </motion.div>
          )}

          {activeTab === 'tablets' && (
            <motion.div
              key="tab-tablets"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <TabletLoanManager
                tablets={effectiveTablets}
                loans={tabletLoans}
                technicians={technicians}
                onAddLoan={handleAddTabletLoan}
                onUpdateLoan={handleUpdateTabletLoan}
                onDeleteLoan={handleDeleteTabletLoan}
                onReturnTablet={handleReturnTablet}
                onUpdateTablet={handleUpdateTablet}
                onToggleTabletStatus={handleToggleTabletStatus}
                onSyncOfficialTablets={handleSyncOfficialTablets}
                onClearAllLoans={clearAllTabletLoans}
              />
            </motion.div>
          )}

          {activeTab === 'financial' && (
            <motion.div
              key="tab-financial"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <FinancialAssetManager
                financialAssets={financialAssets}
                transactions={transactions}
                hospitals={hospitals}
                marketingList={marketingList}
                onAddTransaction={(newTrx) => {
                  addTransaction(newTrx);
                  showToast(`Transaksi ${newTrx.category} berhasil dicatat!`);
                }}
                onAddFinancialAsset={(newAsset) => {
                  addFinancialAsset(newAsset);
                  showToast(`Pos aset ${newAsset.name} berhasil ditambahkan!`);
                }}
                onDeleteTransaction={(trxId) => {
                  removeTransaction(trxId);
                  showToast('Transaksi berhasil dihapus.');
                }}
                onDeleteFinancialAsset={(assetId) => {
                  removeFinancialAsset(assetId);
                  showToast('Pos aset berhasil dihapus.');
                }}
              />
            </motion.div>
          )}

          {activeTab === 'masters' && (
            <motion.div
              key="tab-masters"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <MasterHospitalAndTech
                schedules={schedules}
                onUpdateSchedule={(sch) => {
                  updateSchedule(sch);
                  showToast('Update perkembangan selia berhasil disimpan!');
                }}
                hospitals={hospitals}
                technicians={technicians}
                marketingList={marketingList}
                onAddHospital={(h) => {
                  addHospital(h);
                  showToast(`Rumah sakit ${h.name} berhasil ditambahkan.`);
                }}
                onUpdateHospital={(updated) => {
                  updateHospital(updated);
                  showToast(`Data rumah sakit ${updated.name} berhasil diperbarui.`);
                }}
                onDeleteHospital={(hospId) => {
                  removeHospital(hospId);
                  showToast('Rumah sakit telah dihapus dari master.');
                }}
                onAddTechnician={(t) => {
                  addTechnician(t);
                  showToast(`Teknisi ${t.name} berhasil didaftarkan.`);
                }}
                onUpdateTechnician={(updated) => {
                  updateTechnician(updated);
                  showToast(`Data teknisi ${updated.name} berhasil diperbarui.`);
                }}
                onDeleteTechnician={(techId) => {
                  removeTechnician(techId);
                  showToast('Teknisi telah dihapus dari master.');
                }}
                onAddMarketing={(m) => {
                  addMarketing(m);
                  showToast(`Staf marketing ${m.name} berhasil didaftarkan.`);
                }}
                onDeleteMarketing={(mId) => {
                  removeMarketing(mId);
                  showToast('Staf marketing telah dihapus.');
                }}
                onQuickCreateScheduleForHospital={handleQuickCreateScheduleForHospital}
              />
            </motion.div>
          )}


          {activeTab === 'templates' && (
            <motion.div
              key="tab-templates"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <TemplateSettings />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-[#144966] text-[#D8D2CB] text-xs py-6 border-t border-[#1C658C] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wide">PT. SARANA MULTI KALIBRASI</span>
            <span className="text-[#398AB9]/60">•</span>
            <span className="text-[#D8D2CB]">Sistem Manajemen Aset, Keuangan & Kalibrasi RS</span>
          </div>
          <div className="flex items-center gap-4 text-[#D8D2CB]/80 text-[11px]">
            <span>Standar Permenkes RI No. 54 Tahun 2015</span>
            <span className="text-[#398AB9]/60">•</span>
            <span>Akreditasi ISO/IEC 17025</span>
          </div>
        </div>
      </footer>

      {/* Interactive Modals */}
      {selectedSchedule && (
        <WorkOrderDetailModal
          schedule={selectedSchedule}
          onClose={() => setSelectedSchedule(null)}
          onUpdateSchedule={handleUpdateSingleSchedule}
          onOpenPrintModal={(sch) => {
            setSelectedSchedule(null);
            setPrintSchedule(sch);
          }}
          onOpenEditModal={(sch) => {
            setSelectedSchedule(null);
            setEditingSchedule(sch);
            setShowNewScheduleModal(true);
          }}
          onSendReminder={handleSendAutomatedReminder}
        />
      )}

      {showNewScheduleModal && (
        <ScheduleFormModal
          isOpen={showNewScheduleModal}
          onClose={() => {
            setShowNewScheduleModal(false);
            setEditingSchedule(null);
          }}
          onSave={handleSaveSchedule}
          hospitals={hospitals}
          technicians={technicians}
          calibrators={calibrators}
          initialData={editingSchedule}
        />
      )}

      {showSpkModal && (
        <SpkFormModal
          isOpen={showSpkModal}
          onClose={() => {
            setShowSpkModal(false);
            setSpkEditingSchedule(null);
          }}
          onSave={handleSaveSpk}
          hospitals={hospitals}
          technicians={technicians}
          calibrators={calibrators}
          initialData={spkEditingSchedule}
        />
      )}

      {printSchedule && (
        <WorkOrderPrintModal
          schedule={printSchedule}
          onClose={() => setPrintSchedule(null)}
          onOpenEditForm={(sch) => handleOpenSpkModal(sch)}
        />
      )}

      {/* SPH Form Modal */}
      {showSphModal && (
        <SphFormModal
          isOpen={showSphModal}
          onClose={() => {
            setShowSphModal(false);
            setEditingSph(null);
          }}
          onSave={handleSaveSph}
          hospitals={hospitals}
          initialSph={editingSph}
          existingSphCount={sphList.length}
        />
      )}

      {/* SPH Print Modal (3-Page Official SPH Kemenkes Document) */}
      {printSph && (
        <SphPrintModal
          sph={printSph}
          isOpen={!!printSph}
          onClose={() => setPrintSph(null)}
          onConvertToSpk={(sph) => {
            setPrintSph(null);
            handleConvertToSpkFromSph(sph);
          }}
        />
      )}

      {/* Floating Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1C658C] text-white px-4 py-3 rounded-xl shadow-2xl border border-[#398AB9] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <div className="w-7 h-7 rounded-lg bg-[#398AB9]/30 text-[#EEEEEE] flex items-center justify-center shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <p className="text-xs font-medium pr-2">{toastMessage}</p>
        </div>
      )}
    </div>
  );
}
