import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface CopyButtonProps {
    text: string;
    className?: string;
}

export function CopyButton({ text, className }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            title="Copy to clipboard"
            className={clsx(
                'inline-flex items-center justify-center h-7 w-7 rounded-md border border-[--color-border] text-[--color-text-muted] transition-colors hover:text-[--color-text-primary] hover:bg-[--color-elevated]',
                className,
            )}
        >
            {copied ? <Check size={13} className="text-[--color-log-success]" /> : <Copy size={13} />}
        </button>
    );
}
