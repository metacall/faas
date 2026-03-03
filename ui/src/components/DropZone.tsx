import { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { clsx } from 'clsx';

interface DropZoneProps {
  onFile: (file: File) => void;
  file?: File | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DropZone({ onFile, file }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFile(dropped);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) onFile(selected);
  };

  return (
    <div
      onDragOver={e => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={clsx(
        'relative flex flex-col items-center justify-center w-full h-64 cursor-pointer transition-all duration-200 group',
        'border-2 border-dashed border-[--color-border-dark]',
        dragging
          ? 'bg-[color-mix(in_srgb,var(--color-primary)_5%,white)]'
          : 'bg-[--color-elevated] hover:bg-gray-100',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleChange}
        aria-label="Upload ZIP file"
      />

      {file ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 flex items-center justify-center bg-white border border-[--color-border] shadow-sm">
            <UploadCloud size={24} className="text-[--color-primary]" />
          </div>
          <p className="text-sm font-semibold text-[--color-text-primary]">{file.name}</p>
          <p className="text-xs text-[--color-text-muted]">{formatBytes(file.size)}</p>
          <p className="text-xs text-[--color-primary]">Click or drag to replace</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-center pointer-events-none transition-transform duration-200 group-hover:scale-105">
          <div className="w-14 h-14 flex items-center justify-center bg-white border border-[--color-border] shadow-sm group-hover:shadow-md group-hover:border-[--color-primary]/30 transition-all">
            <UploadCloud size={28} className="text-[--color-primary]" />
          </div>
          <p className="text-base font-semibold text-[--color-text-primary]">
            Drag & drop your .zip file here
          </p>
          <p className="text-sm text-[--color-text-muted]">Or browse to upload (Max size: 50MB)</p>
          <button
            type="button"
            className="pointer-events-auto bg-white text-[--color-text-primary] text-sm font-semibold py-2 px-5 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
            onClick={e => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Browse Files
          </button>
        </div>
      )}
    </div>
  );
}
