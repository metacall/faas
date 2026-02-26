import { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { clsx } from 'clsx';

interface DropZoneProps {
    onFileSelect: (file: File) => void;
    accept?: string;
}

export function DropZone({ onFileSelect, accept = '.zip' }: DropZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [selected, setSelected] = useState<File | null>(null);

    const handleFile = useCallback((file: File) => {
        setSelected(file);
        onFileSelect(file);
    }, [onFileSelect]);

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    return (
        <label
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={clsx(
                'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 cursor-pointer transition-colors',
                isDragging
                    ? 'border-[--color-primary] bg-[--color-primary]/5'
                    : 'border-[--color-border] hover:border-[--color-primary]/50 hover:bg-[--color-elevated]',
            )}
        >
            <Upload size={32} className={isDragging ? 'text-[--color-primary]' : 'text-[--color-text-muted]'} />
            {selected ? (
                <div className="text-center">
                    <p className="text-sm font-medium text-[--color-text-primary]">{selected.name}</p>
                    <p className="text-xs text-[--color-text-muted]">{(selected.size / 1024).toFixed(1)} KB</p>
                </div>
            ) : (
                <div className="text-center">
                    <p className="text-sm font-medium text-[--color-text-primary]">Drop your .zip here</p>
                    <p className="text-xs text-[--color-text-muted]">or click to browse</p>
                </div>
            )}
            <input type="file" accept={accept} onChange={onInputChange} className="sr-only" />
        </label>
    );
}
