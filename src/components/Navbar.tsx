import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Calendar, 
  Bell, 
  Wrench, 
  Wallet, 
  Building2, 
  PlusCircle, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Clock,
  Tablet,
  LogOut,
  Settings,
  Trash2,
  ShieldCheck,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CalibrationSchedule, CalibratorAsset } from '../types';
import { getUrgencyInfo } from '../utils/helpers';
import { CompanyLogo } from './CompanyLogo';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { useAuth } from '../firebase/AuthContext';

export type AppTab = 'dashboard' | 'sph' | 'schedules' | 'calibrators' | 'tablets' | 'financial' | 'masters' | 'templates';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  schedules: CalibrationSchedule[];
  calibrators: CalibratorAsset[];
  sphCount?: number;
  borrowedTabletsCount?: number;
  onOpenNewSchedule: () => void;
  onOpenNewSph?: () => void;
  onPurgeAllData?: () => void;
}

interface SlideGroup {
  id: number;
  title: string;
  category: string;
  badge: string;
  tabs: {
    id: AppTab;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    badgeVal?: string | number;
    badgeColor?: string;
  }[];
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  schedules,
  calibrators,
  sphCount = 0,
  borrowedTabletsCount = 0,
  onOpenNewSchedule,
  onOpenNewSph,
  onPurgeAllData
}) => {
  const { user, role, logout } = useAuth();
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  // Calculate critical alert count
  const criticalRemindersCount = schedules.filter(sch => {
    if (sch.status === 'Selesai Kalibrasi' || sch.status === 'Sertifikat Terbit' || sch.status === 'Dibatalkan') return false;
    const urgency = getUrgencyInfo(sch);
    return urgency.level === 'CRITICAL' || urgency.level === 'OVERDUE' || urgency.level === 'WARNING';
  }).length;

  const expiringCalibratorsCount = calibrators.filter(c => c.condition === 'Perlu Kalibrasi Ulang').length;

  // Define 3 clean, categorized Slide Groups containing all 8 modules
  const slideGroups: SlideGroup[] = [
    {
      id: 1,
      title: 'Alur Utama Operasional RS',
      category: 'Alur Utama',
      badge: 'Tahap 1-3',
      tabs: [
        {
          id: 'dashboard',
          label: 'Dashboard Utama',
          sublabel: 'Monitoring & Kalender',
          icon: Activity
        },
        {
          id: 'sph',
          label: 'Penawaran SPH',
          sublabel: 'Katalog 121 Alat & Cetak',
          icon: FileText,
          badgeVal: sphCount > 0 ? sphCount : undefined,
          badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
        },
        {
          id: 'schedules',
          label: 'Penjadwalan RS',
          sublabel: 'SPK, BAP, BASTP & Teknisi',
          icon: Calendar,
          badgeVal: schedules.length,
          badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
        }
      ]
    },
    {
      id: 2,
      title: 'Monitoring Kepatuhan & Aset',
      category: 'Kepatuhan & Alat',
      badge: 'Monitoring',
      tabs: [
        {
          id: 'calibrators',
          label: 'Aset Alat Kalibrator',
          sublabel: 'Standar Uji & Ketertelusuran',
          icon: Wrench,
          badgeVal: expiringCalibratorsCount > 0 ? `${expiringCalibratorsCount} Perlu Uji` : `${calibrators.length} Unit`,
          badgeColor: expiringCalibratorsCount > 0 ? 'bg-amber-950 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-300 border-slate-700'
        },
        {
          id: 'tablets',
          label: 'Peminjaman Tablet',
          sublabel: '6 Unit Tablet Kalibrasi',
          icon: Tablet,
          badgeVal: borrowedTabletsCount > 0 ? `${borrowedTabletsCount} Dipinjam` : '6 Siap',
          badgeColor: borrowedTabletsCount > 0 ? 'bg-amber-950 text-amber-300 border-amber-500/40' : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
        }
      ]
    },
    {
      id: 3,
      title: 'Sistem & Master Database',
      category: 'Sistem & Master',
      badge: 'Database',
      tabs: [
        {
          id: 'financial',
          label: 'Aset Keuangan',
          sublabel: 'Buku Kas & Piutang SPH',
          icon: Wallet
        },
        {
          id: 'masters',
          label: 'Master Tim Teknisi',
          sublabel: '11 Personel Elektromedis & Marketing',
          icon: Building2
        },
        {
          id: 'templates',
          label: 'Template Dokumen',
          sublabel: 'Pengaturan SPH, SPK, BAP',
          icon: Settings
        }
      ]
    }
  ];

  // Determine current slide index based on activeTab
  const getSlideIndexForTab = (tab: AppTab): number => {
    if (tab === 'dashboard' || tab === 'sph' || tab === 'schedules') return 0;
    if (tab === 'calibrators' || tab === 'tablets') return 1;
    return 2;
  };

  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Real-time clock updating every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(() => getSlideIndexForTab(activeTab));

  // Sync slide index whenever activeTab changes
  useEffect(() => {
    const targetSlide = getSlideIndexForTab(activeTab);
    setCurrentSlideIndex(targetSlide);
  }, [activeTab]);

  const handlePrevSlide = () => {
    const newIdx = (currentSlideIndex - 1 + slideGroups.length) % slideGroups.length;
    setCurrentSlideIndex(newIdx);
  };

  const handleNextSlide = () => {
    const newIdx = (currentSlideIndex + 1) % slideGroups.length;
    setCurrentSlideIndex(newIdx);
  };

  const currentGroup = slideGroups[currentSlideIndex];

  return (
    <header className="bg-[#1C658C] text-white sticky top-0 z-40 border-b border-[#144966] shadow-xl select-none">
      {/* Top Micro Information Bar */}
      <div className="bg-[#144966] px-4 py-1.5 text-xs text-[#D8D2CB] border-b border-[#1C658C]/60">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <span className="inline-flex items-center text-[#EEEEEE] font-medium text-[11px] sm:text-xs">
              <span className="w-2 h-2 rounded-full bg-[#398AB9] animate-pulse mr-1.5 shadow-[0_0_8px_#398AB9]"></span>
              Sistem Aktif & Terhubung Metrologi Medis
            </span>
            <span className="text-[#398AB9]/50 hidden md:inline">|</span>
            <span className="hidden md:inline text-[#D8D2CB] text-[11px]">
              Permenkes No. 54/2015 • Sertifikat Kemenkes No: 26062301565850001
            </span>
          </div>
          
          <div className="flex items-center space-x-3 text-[#EEEEEE]">
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#EEEEEE] bg-[#0F364C] px-2.5 py-0.5 rounded-lg border border-[#1C658C] shadow-inner">
              <Clock className="w-3.5 h-3.5 text-[#398AB9]" />
              <span>
                {currentTime.toLocaleDateString('id-ID', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
              <span className="text-[#398AB9]/60">|</span>
              <span className="font-bold text-white tracking-widest">
                {currentTime.toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </span>
              <span className="text-[10px] text-[#398AB9] font-semibold">WIB</span>
            </span>
            <span className="bg-[#0F364C] text-[#398AB9] border border-[#398AB9]/40 px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider uppercase font-mono">
              KAN LK-532-IDN
            </span>
          </div>
        </div>
      </div>

      {/* Main Brand & Quick Action Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between min-h-[4rem] sm:min-h-[4.5rem] py-2 gap-3">
          
          {/* Logo SMK */}
          <div 
            className="flex items-center shrink-0 py-1"
            id="brand-logo-btn"
          >
            <CompanyLogo size="md" showSubtitle={true} variant="dark" allowUpload={true} />
          </div>

          {/* User Profile Badge & Logout Button */}
          <div className="flex items-center gap-2.5 shrink-0">
            {user && (
              <div className="hidden sm:flex items-center gap-2 bg-[#0F364C] px-3 py-1.5 rounded-xl border border-[#1C658C] shadow-sm text-xs">
                <div className={`w-2 h-2 rounded-full ${role === 'admin_keuangan' ? 'bg-emerald-400' : 'bg-cyan-400'} animate-pulse`}></div>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-white text-[11px] leading-tight">
                    {user.displayName || (role === 'admin_keuangan' ? 'Admin Keuangan' : 'Admin Teknik')}
                  </span>
                  <span className="text-[9px] text-[#D8D2CB]/80 font-mono leading-tight">
                    {user.email || (role === 'admin_keuangan' ? 'adminkeuangan@ptsmk.com' : 'adminteknik@ptsmk.com')}
                  </span>
                </div>
              </div>
            )}
            
            <button
              onClick={() => logout()}
              className="px-3 py-2 bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-xs font-semibold hover:scale-[1.02] active:scale-95 border border-rose-500/50"
              title="Keluar dari Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* SLIDE NAVIGATION BAR: Flux Aesthetic with Refined Tab Sliders            */}
      {/* ========================================================================= */}
      <div className="bg-[#144966] border-t border-[#1C658C] px-2 sm:px-6 py-2.5 shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          
          {/* Sisi Kiri: Navigasi Slide */}
          <div className="flex items-center justify-between md:justify-start gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-[#0F364C] p-1 rounded-xl border border-[#1C658C] shadow-sm">
              <button
                onClick={handlePrevSlide}
                id="btn-slide-prev"
                className="p-1.5 rounded-lg hover:bg-[#1C658C] text-[#D8D2CB] hover:text-white transition-all active:scale-90"
                title="Slide Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Slide Group Switcher Buttons */}
              <div className="flex items-center space-x-1 px-1">
                {slideGroups.map((slide, idx) => (
                  <button
                    key={slide.id}
                    id={`btn-slide-selector-${slide.id}`}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      currentSlideIndex === idx
                        ? 'bg-[#398AB9] text-white shadow-sm font-semibold'
                        : 'text-[#D8D2CB] hover:text-white hover:bg-[#1C658C]/70'
                    }`}
                  >
                    <span className="text-[10px] opacity-80 font-mono">0{slide.id}</span>
                    <span className="hidden sm:inline">{slide.category}</span>
                    <span className="sm:hidden">Slide {slide.id}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={handleNextSlide}
                id="btn-slide-next"
                className="p-1.5 rounded-lg hover:bg-[#1C658C] text-[#D8D2CB] hover:text-white transition-all active:scale-90"
                title="Slide Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Slide Title Label */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-[#D8D2CB] pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#398AB9]"></span>
              <span className="font-semibold text-[#EEEEEE]">{currentGroup.title}</span>
            </div>
          </div>

          {/* Sisi Kanan: Pilihan Menu / Tab Aktif dalam Slide */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={`slide-content-${currentGroup.id}`}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="flex items-center gap-1.5 w-full md:w-auto"
              >
                {currentGroup.tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      id={`nav-${tab.id}-tab`}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap border shrink-0 ${
                        isActive
                          ? 'bg-gradient-to-r from-[#1C658C] to-[#398AB9] text-white border-[#398AB9] shadow-md ring-1 ring-[#398AB9]/50'
                          : 'bg-[#0F364C]/90 text-[#D8D2CB] hover:text-white hover:bg-[#1C658C] border-[#1C658C]/60'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#EEEEEE]' : 'text-[#398AB9]'}`} />
                      <div className="text-left flex flex-col">
                        <span className="leading-tight">{tab.label}</span>
                        <span className={`text-[10px] leading-tight font-normal ${isActive ? 'text-[#EEEEEE]/90' : 'text-[#D8D2CB]/80'}`}>
                          {tab.sublabel}
                        </span>
                      </div>

                      {tab.badgeVal !== undefined && (
                        <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${tab.badgeColor || 'bg-[#0F364C] text-[#EEEEEE] border-[#1C658C]'}`}>
                          {tab.badgeVal}
                        </span>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={showPurgeConfirm}
        title="Mulai Semua dari Kosongan?"
        message="Apakah Anda yakin ingin MENGOSONGKAN SELURUH DATA SISTEM sekarang? Seluruh dokumen jadwal, SPH, master alat/teknisi/RS, dan transaksi akan dihapus secara permanen. Data tidak akan pernah kembali lagi dan sistem akan mulai murni dari 0 (kosongan)."
        itemName="Semua Koleksi Database (Jadwal, SPH, Master, Transaksi, Aset)"
        confirmText="Ya, Kosongkan Semua Sekarang"
        cancelText="Batal"
        onConfirm={() => {
          if (onPurgeAllData) {
            onPurgeAllData();
          }
          setShowPurgeConfirm(false);
        }}
        onClose={() => setShowPurgeConfirm(false)}
      />
    </header>
  );
};
