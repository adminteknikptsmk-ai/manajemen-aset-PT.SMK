export type UrgencyLevel = 'CRITICAL' | 'WARNING' | 'UPCOMING' | 'OVERDUE' | 'NORMAL';

export type ScheduleStatus = 
  | 'Dijadwalkan'
  | 'Mendekati Tenggat'
  | 'Sedang Berjalan'
  | 'Selesai Kalibrasi'
  | 'Sertifikat Terbit'
  | 'Terlambat/Overdue'
  | 'Dibatalkan';

export type CalibratorCondition = 
  | 'Sangat Baik' 
  | 'Siap Pakai' 
  | 'Perlu Kalibrasi Ulang' 
  | 'Dalam Perbaikan' 
  | 'Rusak/Afkir';

export type CalibratorCategory = 
  | 'Kelistrikan Medis (ESA)'
  | 'Simulator Pasien & ECG'
  | 'Ventilator & Gas Flow'
  | 'Defibrilator & ESU'
  | 'Infusion & Syringe Pump Tester'
  | 'Radiologi & X-Ray Tester'
  | 'Tekanan & Suhu (Pressure/Temp)'
  | 'Optik & Audiometri';

export type AuditStatus = 
  | 'Belum Diaudit'
  | 'Diverifikasi Auditor'
  | 'Lolos Audit'
  | 'Perlu Klarifikasi';

export interface MedicalDeviceToCalibrate {
  id: string;
  name: string;
  quantity: number; // Jumlah unit alat
  room: string;
  brandModel: string;
  serialNumber: string;
  labelNumber?: string; // Label Kalibrasi e.g. 062.0001 atau 062.0001 s/d 062.0004
  labelSequenceStart?: number;
  labelSequenceEnd?: number;
  status: 'Pending' | 'In Progress' | 'Pass' | 'Fail' | 'Needs Adjustment';
  measuredErrorPercent?: number;
  notes?: string;
}

export interface CalibrationSchedule {
  id: string;
  workOrderNumber: string;
  bapNumber?: string;          // Nomor Berita Acara Pekerjaan e.g. 021/SMK/BAP/VIII/2026
  bastpNumber?: string;        // Nomor Berita Acara Serah Terima Pekerjaan / Kalibrasi
  poContractNumber?: string;   // Nomor PO / Kontrak dari Rumah Sakit
  poDate?: string;             // Tanggal PO / Kontrak
  hospitalId: string;
  hospitalCode?: string;       // 3 Digit Kode RS (e.g. 062 atau 100)
  hospitalName: string;
  hospitalAddress?: string;    // Alamat lengkap RS untuk SPK, BAP & BASTP
  hospitalCity: string;
  hospitalPic: string;
  hospitalPicRole?: string;    // e.g. Ka. IPSRS / Teknisi ATEM
  hospitalPhone: string;
  scheduledDate: string;       // YYYY-MM-DD (Tanggal Mulai)
  endDate: string;             // YYYY-MM-DD (Tanggal Selesai)
  leadTechnicianId: string;
  leadTechnicianName: string;
  supportTechnicianIds: string[];
  supportTechnicianNames: string[];
  marketingName?: string;      // Marketing yang menangani
  labelStart?: string;         // Label Awal e.g. 062.0001
  labelEnd?: string;           // Label Akhir e.g. 062.0020
  labelRange?: string;         // e.g. 062.0001 s/d 062.0020
  labelSequenceStart?: number; // default 1
  targetDevices: MedicalDeviceToCalibrate[];
  assignedCalibratorIds: string[];
  assignedCalibratorNames: string[];
  priority: 'Kritis' | 'Tinggi' | 'Sedang' | 'Rutin';
  status: ScheduleStatus;
  estimatedHours: number;
  contractValue: number;       // Nilai kontrak rupiah (bisa diedit)
  notes?: string;
  progressPercent: number;
  completedDate?: string;
  certificateNumber?: string;
  pdfUrl?: string;             // Link to uploaded SPK PDF
  bapPdfUrl?: string;          // Link to uploaded BAP PDF
  bastpPdfUrl?: string;        // Link to uploaded BASTP PDF
  createdAt: string;
  remindersSentCount: number;
  lastReminderSentAt?: string;
  approvedByName?: string;     // Hafizh Pasifianto, S.Tr.T.
  approvedByRole?: string;     // Manajer Teknik PT. Sarana Multi Kalibrasi
  mtSignatureUrl?: string;     // TTD Manajer Teknik
}

export interface CalibratorAsset {
  id: string;
  code: string;
  name: string;
  category?: string;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  lastCalibratedDate: string;
  nextCalibrationDueDate: string; // Otomatis 1 tahun setelah lastCalibratedDate atau disesuaikan
  calibrationLab: string; // e.g. BPFK Jakarta / LIPI / PT Sucofindo (KAN)
  certificateNumber: string;
  condition: CalibratorCondition;
  location: string;
  currentHolderTechnician?: string;
  traceability?: string;          // e.g. LK-110-IDN / LK-242-IDN / LK-032-IDN
  priceRange?: string;            // e.g. Rp 80 Juta - Rp 150 Juta
  usedForDeviceCount?: string;    // e.g. 72 alat
  maintenanceLog: {
    date: string;
    description: string;
    cost: number;
    performedBy: string;
  }[];
}

export interface FinancialAsset {
  id: string;
  name: string;
  category: 'Kas & Rekening Operasional' | 'Piutang Kontrak RS' | 'Investasi Alat Kalibrator' | 'Deposito & Cadangan' | 'Aset Lancar Lain';
  amount: number;
  lastUpdated: string;
  accountNumber?: string;
  bankName?: string;
  status: 'Aktif' | 'Pending Cair' | 'Dicadangkan';
  notes?: string;
}

export interface FinancialTransaction {
  id: string;
  date: string;
  type: 'Pemasukan (Revenue Kalibrasi)' | 'Pengeluaran (Operasional Lapangan)' | 'Pengeluaran (Re-Kalibrasi BPFK/Alat)' | 'Pembelian Aset Baru';
  category: string;
  amount: number;
  referenceNo: string;
  description: string;
  relatedHospitalName?: string;
  relatedWorkOrder?: string;
  marketingName?: string;
  recordedBy: string;
  // Audit Fields
  auditStatus: AuditStatus;
  auditorName?: string;
  auditedAt?: string;
  auditNotes?: string;
}

export interface Hospital {
  id: string;
  hospitalCode?: string; // e.g. '100', '101', '102'
  name: string;
  type: 'RSUP' | 'RSUD' | 'RS Swasta' | 'Klinik Utama' | 'Laboratorium Medis';
  address: string;
  city: string;
  picName: string;
  picRole?: string; // IPSRS / ATEM
  picPhone: string;
  picEmail: string;
  marketingInCharge?: string;
  contractStatus: 'Aktif' | 'Perlu Perpanjangan' | 'Selesai';
  activeDevicesCount: number;
  lastCalibrationDate?: string;
}

export interface Technician {
  id: string;
  name: string;
  title: string;
  strNumber: string; // Nomor STR Elektromedis
  specialization: string;
  certifications?: string[];
  phone: string;
  email: string;
  status: 'Tersedia' | 'Sedang Bertugas' | 'Cuti';
  activeAssignmentsCount: number;
  completedJobsCount: number;
  rating: number;
  avatarColor: string;
  isManager?: boolean;
}

export interface MarketingStaff {
  id: string;
  name: string;
  title: string;
  phone: string;
  email: string;
  assignedRegion: string;
  activeHospitalCount: number;
  totalDealValue: number;
  status: 'Aktif' | 'Non-Aktif';
}

export interface AutomaticReminder {
  id: string;
  scheduleId: string;
  workOrderNumber: string;
  hospitalName: string;
  scheduledDate: string;
  daysRemaining: number;
  urgency: UrgencyLevel;
  technicianName: string;
  technicianPhone: string;
  message: string;
  isAcknowledged: boolean;
  createdAt: string;
  status: 'Pending' | 'Terkirim Otomatis' | 'Ditinjau';
}

export interface SphItem {
  id: string;
  catalogNumber?: number;
  description: string;
  quantity: number;
  unit: string;
  standardPrice: number;    // Harga standar katalog brosur
  unitPrice: number;        // Harga satuan hasil penawaran / negosiasi
  totalPrice: number;       // quantity * unitPrice
  notes?: string;           // e.g. *Hanya dilakukan Uji Keselamatan Listrik...
  category?: string;
}

export interface SphQuotation {
  id: string;
  sphNumber: string;           // e.g. 045/SMK-SPH/VII-2026
  subject: string;             // Surat Penawaran Harga Kalibrasi
  attachmentPages: string;     // '2 lembar'
  date: string;                // YYYY-MM-DD
  city: string;                // Surakarta
  hospitalId?: string;
  hospitalName: string;
  hospitalAddress: string;
  hospitalPic?: string;
  hospitalPhone?: string;
  recipientRole?: string;       // Direktur
  items: SphItem[];
  subtotalOriginal: number;    // Total awal sebelum negosiasi
  subtotal1: number;           // Total harga alat setelah negosiasi
  accommodationFee: number;    // Biaya transportasi & akomodasi
  subtotal2: number;           // subtotal1 + accommodationFee
  ppnPercent: number;          // 11
  isPpnIncluded: boolean;      // Default true
  ppnAmount: number;           // Nilai PPN 11%
  grandTotal: number;          // Total deal akhir
  terbilang: string;           // Terbilang dalam Rupiah
  marketingStaffName: string;  // Erwin
  marketingStaffPhone: string; // 0852-0006-0589
  directorName: string;        // Ahmad Fajar Ariyanto
  directorTitle: string;       // Direktur
  bankName: string;            // Bank Mandiri Cab. Surakarta
  bankAccountNumber: string;   // 138-00-2610846-9
  bankAccountName: string;     // SARANA MULTI KALIBRASI PT
  termsAndConditions: string[];
  status: 'Draft' | 'Terkirim ke RS' | 'Negosiasi' | 'Disetujui (Deal)' | 'Ditolak';
  negotiationTarget?: number;
  negotiationType?: 'INCLUDE_PPN' | 'EXCLUDE_PPN' | 'MANUAL';
  discountAmount?: number;
  discountPercent?: number;
  pdfUrl?: string;             // Link to uploaded SPH PDF
  createdAt: string;
  validUntilDate: string;
}

export interface TabletDevice {
  id: string;              // 'TAB-01'
  unitNumber: number;      // 1 to 6
  name: string;            // 'Tablet Kalibrasi 01'
  code: string;            // 'SMK-TAB-01'
  model: string;           // 'Xiaomi Redmi Pad 2' or 'Xiaomi Redmi Pad SE'
  serialNumber: string;    // 'SMK-TAB-SN001'
  colorTag: string;        // hex or tailwind
  condition: 'Sangat Baik' | 'Baik' | 'Perlu Pengecekan';
  accessories: string[];   // ['Stylus Pen', 'Rugged Armor Case', 'Fast Charger 25W', 'Kabel OTG']
  assignedRole?: 'Khusus Admin' | 'Teknisi';
  currentBorrower?: string;
  currentLoanId?: string;
  isAvailable: boolean;
  notes?: string;
}

export interface TabletLoan {
  id: string;               // e.g. 'TL-2026-001'
  loanNumber: string;       // e.g. '001/TAB-KAL/IX/2026'
  no: number;               // Nomor urut (1, 2, 3...)
  tabletId: string;         // 'TAB-01'
  tabletName: string;       // 'Tablet Kalibrasi 01'
  borrowerName: string;     // Nama peminjam
  borrowerRole?: string;    // Teknisi Elektromedis
  borrowDate: string;       // Tanggal peminjaman (YYYY-MM-DD)
  purpose: string;          // Keperluan peminjaman
  duration: string;         // Lama peminjaman (e.g. '2 Hari')
  expectedReturnDate?: string;
  actualReturnDate?: string;
  notes: string;            // Keterangan
  status: 'Dipinjam' | 'Dikembalikan';
  returnedCondition?: string;
  approverName?: string;    // Petugas penyerah / PIC Lab
  createdAt: string;
}


