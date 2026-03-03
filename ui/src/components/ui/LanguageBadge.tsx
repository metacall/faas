import { clsx } from 'clsx';
import type { LanguageId } from '@/types';

interface LanguageBadgeProps {
  language: LanguageId | string;
}

const LANG_CONFIG: Partial<
  Record<LanguageId | string, { label: string; bg: string; text: string }>
> = {
  node: { label: 'Node.js', bg: 'bg-yellow-900/20', text: 'text-gray-800' },
  ts: { label: 'TypeScript', bg: 'bg-blue-900/20', text: 'text-gray-800' },
  py: { label: 'Python', bg: 'bg-sky-900/20', text: 'text-gray-800' },
  rb: { label: 'Ruby', bg: 'bg-red-900/20', text: 'text-gray-800' },
  cs: { label: 'C#', bg: 'bg-purple-900/20', text: 'text-gray-800' },
  cob: { label: 'COBOL', bg: 'bg-gray-800', text: 'text-gray-300' },
  file: { label: 'File', bg: 'bg-gray-800', text: 'text-gray-400' },
  rpc: { label: 'RPC', bg: 'bg-indigo-900/20', text: 'text-gray-800' },
};

export function LanguageBadge({ language }: LanguageBadgeProps) {
  const config = LANG_CONFIG[language] ?? {
    label: language,
    bg: 'bg-gray-800',
    text: 'text-gray-400',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        config.bg,
        config.text,
      )}
    >
      {config.label}
    </span>
  );
}
