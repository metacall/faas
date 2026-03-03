import { useState } from 'react';
import type { Deployment } from '@/types';
import { api } from '@/api/client';
import { Spinner } from './ui/Spinner';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { CopyButton } from './ui/CopyButton';

interface FunctionTesterProps {
  deployment: Deployment;
}

interface FuncEntry {
  name: string;
  params?: { name: string }[] | string[];
  lang: string;
  handleName: string;
}

function getParamNames(func: FuncEntry): string[] {
  if (!func.params || func.params.length === 0) return [];
  return func.params.map((p: { name: string } | string) =>
    typeof p === 'string' ? p : p.name,
  );
}

export function FunctionTester({ deployment }: FunctionTesterProps) {
  const [openFunc, setOpenFunc] = useState<string | null>(null);

  const baseUrl =
    (import.meta.env.VITE_FAAS_URL as string | undefined) ?? 'http://localhost:9000';

  const allFuncs: FuncEntry[] = Object.entries(deployment.packages ?? {}).flatMap(
    ([lang, handles]) =>
      handles.flatMap(handle =>
        handle.scope.funcs.map(f => ({
          ...(f as object),
          name: (f as { name: string }).name,
          params: (f as { params?: { name: string }[] | string[] }).params,
          lang,
          handleName: handle.name,
        })),
      ),
  );

  if (allFuncs.length === 0) {
    return (
      <div className="bg-white flex flex-col items-center justify-center h-full p-12 text-center">
        <Layers size={32} className="text-gray-300 mb-3" />
        <p className="text-sm font-semibold text-gray-500">No exported functions found</p>
        <p className="text-xs text-gray-400 mt-1">Deploy a package that exports functions to test them here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-200 bg-gray-50/60 flex items-center justify-between sticky top-0 z-10">
        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">
          Exported Functions
        </span>
        <span className="text-[11px] text-slate-400 font-medium">
          {allFuncs.length} function{allFuncs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Accordion list */}
      <div className="overflow-y-auto flex-1">
        {allFuncs.map(func => {
          const funcKey = `${func.lang}::${func.handleName}::${func.name}`;
          const endpoint = `${baseUrl}/${deployment.prefix}/${deployment.suffix}/${deployment.version}/call/${func.name}`;
          const isOpen = openFunc === funcKey;
          return (
            <FunctionRow
              key={funcKey}
              func={func}
              endpoint={endpoint}
              isOpen={isOpen}
              onToggle={() => setOpenFunc(isOpen ? null : funcKey)}
              prefix={deployment.prefix}
              suffix={deployment.suffix}
              version={deployment.version}
            />
          );
        })}
      </div>
    </div>
  );
}

// Accordion row (holds its own test state)
function FunctionRow({
  func,
  endpoint,
  isOpen,
  onToggle,
  prefix,
  suffix,
  version,
}: {
  func: FuncEntry;
  endpoint: string;
  isOpen: boolean;
  onToggle: () => void;
  prefix: string;
  suffix: string;
  version: string;
}) {
  const [argsInput, setArgsInput] = useState('[]');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paramNames = getParamNames(func);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let parsedArgs: unknown[] = [];
      if (argsInput.trim()) {
        parsedArgs = JSON.parse(argsInput);
        if (!Array.isArray(parsedArgs)) throw new Error('Arguments must be a valid JSON array.');
      }
      const res = await api.call(prefix, suffix, version, func.name, parsedArgs);
      setResult(JSON.stringify(res, null, 2));
    } catch (err: unknown) {
      setError((err as Error).message || 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      {/* Row header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors group ${
          isOpen ? 'bg-amber-50' : 'hover:bg-gray-50'
        }`}
      >
        {/* Diamond icon */}
        <span
          className={`shrink-0 transition-colors ${
            isOpen ? 'text-amber-500' : 'text-emerald-500 group-hover:text-emerald-600'
          }`}
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path d="M8 1 L15 8 L8 15 L1 8 Z" />
          </svg>
        </span>

        {/* Signature */}
        <span className="flex-1 font-mono text-[13px] font-medium truncate">
          <span className={isOpen ? 'font-bold text-amber-700' : 'text-slate-700 group-hover:text-slate-900'}>
            {func.name}
          </span>
          {paramNames.length > 0 ? (
            <span className="text-slate-400">
              {' ( '}{paramNames.join(', ')}{' )'}
            </span>
          ) : (
            <span className="text-slate-400">()</span>
          )}
        </span>

        {/* Chevron */}
        <span className={`shrink-0 transition-colors ${isOpen ? 'text-amber-500' : 'text-gray-400 group-hover:text-gray-600'}`}>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {/* Expanded panel */}
      {isOpen && (
        <div className="px-5 pt-3 pb-5 bg-white border-t border-amber-100/80 animate-in slide-in-from-top-1 duration-150">
          {/* Endpoint */}
          <div className="flex items-center gap-2 mb-4 p-2.5 bg-gray-50 border border-gray-200">
            <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold bg-emerald-500 text-white uppercase tracking-wider">
              POST
            </span>
            <code className="flex-1 min-w-0 truncate text-[11px] font-mono text-gray-600">
              {endpoint}
            </code>
            <div className="shrink-0">
              <CopyButton text={endpoint} />
            </div>
          </div>

          {/* Args */}
          <div className="flex flex-col gap-1.5 mb-3">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Arguments JSON Array
              {paramNames.length > 0 && (
                <span className="ml-2 font-mono font-normal normal-case text-gray-400">
                  [{paramNames.join(', ')}]
                </span>
              )}
            </label>
            <textarea
              value={argsInput}
              onChange={e => setArgsInput(e.target.value)}
              placeholder={paramNames.length > 0 ? `e.g. [${paramNames.map(() => '...').join(', ')}]` : '[]'}
              rows={3}
              className="bg-white border border-gray-200 px-3 py-2 font-mono text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-shadow resize-y"
              spellCheck={false}
            />
          </div>

          {/* Run */}
          <div className="flex justify-end">
            <button
              onClick={handleRun}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition-colors disabled:opacity-50"
            >
              {loading && <Spinner size={12} />}
              Execute
            </button>
          </div>

          {/* Output */}
          {(result !== null || error !== null) && (
            <div className="mt-3 flex flex-col gap-1.5 animate-in fade-in">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Response
              </label>
              <div
                className={`p-3 font-mono text-xs overflow-x-auto whitespace-pre border ${
                  error
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-slate-900 text-green-400 border-slate-700'
                }`}
              >
                {error ?? result}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
