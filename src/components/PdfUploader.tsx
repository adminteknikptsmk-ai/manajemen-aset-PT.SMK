import React, { useState } from 'react';
import { uploadFile } from '../lib/storageHelper';
import { UploadCloud, FileText, CheckCircle2, Loader2, X, Eye, Trash2, FileSpreadsheet, Image as ImageIcon } from 'lucide-react';

interface PdfUploaderProps {
  folder: string;
  documentId: string;
  existingPdfUrl?: string;
  onUploadSuccess: (url: string) => void;
  onRemove?: () => void;
  label?: string;
  acceptTypes?: string;
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({ 
  folder, 
  documentId, 
  existingPdfUrl, 
  onUploadSuccess,
  onRemove,
  label = "Dokumen Scan / Lampiran PDF",
  acceptTypes = ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Size limit check (15MB)
    if (file.size > 15 * 1024 * 1024) {
      setError('Ukuran file maksimal 15MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const folderPath = `${folder}/${documentId}`;
      const url = await uploadFile(file, folderPath);
      onUploadSuccess(url);
    } catch (err) {
      console.error('Error uploading document file:', err);
      setError('Gagal mengunggah file. Silakan coba file lain.');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const isImage = existingPdfUrl?.startsWith('data:image/') || 
    existingPdfUrl?.match(/\.(jpeg|jpg|png|gif|webp)$/i);

  return (
    <div className="mt-2 p-3 border border-slate-700/80 rounded-xl bg-slate-900/90 flex flex-col items-start w-full text-xs text-slate-200 shadow-sm">
      <div className="flex items-center justify-between w-full mb-2">
        <div className="flex items-center gap-1.5 font-bold text-cyan-300">
          {isImage ? <ImageIcon className="w-4 h-4 text-cyan-400" /> : <FileText className="w-4 h-4 text-cyan-400" />}
          <span>{label}</span>
        </div>
        {existingPdfUrl && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 p-1 rounded-md transition-all flex items-center gap-1 text-[11px]"
            title="Hapus file lampiran"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus</span>
          </button>
        )}
      </div>
      
      {existingPdfUrl ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="truncate max-w-[180px] sm:max-w-xs">
              <span className="text-xs font-semibold text-emerald-300 block truncate">Dokumen/Scan Terlampir</span>
              <span className="text-[10px] text-slate-400 font-mono block">Format siap cetak / buka</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a 
              href={existingPdfUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Buka File</span>
            </a>

            <label className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-all">
              <span>Ganti</span>
              <input 
                type="file" 
                accept={acceptTypes} 
                className="hidden" 
                onChange={handleFileChange} 
                disabled={uploading} 
              />
            </label>
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-cyan-500/30 hover:border-cyan-400 rounded-xl cursor-pointer bg-slate-950/50 hover:bg-slate-950 transition-colors relative">
          <input 
            type="file" 
            accept={acceptTypes} 
            className="hidden" 
            onChange={handleFileChange} 
            disabled={uploading} 
          />
          {uploading ? (
            <div className="flex flex-col items-center text-cyan-400">
              <Loader2 className="w-5 h-5 animate-spin mb-1" />
              <span className="text-xs font-medium">Mengunggah file ke server...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-slate-400">
              <UploadCloud className="w-5 h-5 mb-1 text-cyan-400" />
              <span className="text-xs font-medium text-slate-300">Klik untuk upload SPH / Kop Surat / BAP / BASTP</span>
              <span className="text-[10px] text-slate-500">(PDF, JPG, PNG, DOCX, XLSX - Maks 15MB)</span>
            </div>
          )}
        </label>
      )}

      {error && (
        <div className="flex items-center gap-1.5 mt-2 text-rose-400 text-xs font-medium">
          <X className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
    </div>
  );
};
