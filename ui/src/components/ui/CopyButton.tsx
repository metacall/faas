import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CopyButtonProps {
  text: string;
}

export function CopyButton({ text }: CopyButtonProps) {
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
      className="p-1 text-[--color-text-muted] hover:text-[--color-primary] transition-colors"
    >
      {copied ? <Check size={13} className="text-[--color-status-ready]" /> : <Copy size={13} />}
    </button>
  );
}
