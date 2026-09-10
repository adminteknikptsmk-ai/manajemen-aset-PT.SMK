import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import { UploadCloud, FileText, CheckCircle2, Loader2, X } from 'lucide-react';

interface PdfUploaderProps {
  folder: 'sph' | 'spk';
  documentId: string;
  existingPdfUrl?: string;
  onUploadSuccess: (url: string) => void;
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({ folder, documentId, existingPdfUrl, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Hanya file PDF yang diizinkan');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file maksimal 5MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const storageRef = ref(storage, `${folder}/${documentId}-${Date.now()}.pdf`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      onUploadSuccess(url);
    } catch (err) {
      console.error('Error uploading PDF:', err);
      setError('Gagal mengunggah file');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="mt-4 p-4 border border-[#D8D2CB] rounded-xl bg-white flex flex-col items-start w-full">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-5 h-5 text-[#398AB9]" />
        <h4 className="font-semibold text-[#1C658C] text-sm">Dokumen Scan PDF</h4>
      </div>
      
      {existingPdfUrl ? (
        <div className="flex items-center justify-between w-full p-3 bg-[#EEEEEE]/50 rounded-lg border border-[#D8D2CB]/50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium text-slate-700">PDF Terlampir</span>
          </div>
          <div className="flex items-center gap-3">
            <a href={existingPdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#1C658C] hover:underline">
              Lihat Dokumen
            </a>
            <label className="text-xs font-semibold text-[#398AB9] hover:underline cursor-pointer">
              Ganti File
              <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} disabled={uploading} />
            </label>
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-[#398AB9]/40 rounded-xl cursor-pointer hover:bg-[#EEEEEE]/50 transition-colors relative">
          <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} disabled={uploading} />
          {uploading ? (
            <div className="flex flex-col items-center text-[#398AB9]">
              <Loader2 className="w-6 h-6 animate-spin mb-1" />
              <span className="text-xs font-medium">Mengunggah...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-slate-500">
              <UploadCloud className="w-6 h-6 mb-1 text-[#398AB9]" />
              <span className="text-xs font-medium">Klik untuk upload file PDF (Maks. 5MB)</span>
            </div>
          )}
        </label>
      )}

      {error && (
        <div className="flex items-center gap-1.5 mt-2 text-rose-500 text-xs font-medium">
          <X className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
    </div>
  );
};
