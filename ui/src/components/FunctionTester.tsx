import { useState } from 'react';
import type { Deployment } from '@/types';
import { api } from '@/api/client';
import { Spinner } from './ui/Spinner';

interface FunctionTesterProps {
  deployment: Deployment;
}

export function FunctionTester({ deployment }: FunctionTesterProps) {
  const [selectedFunc, setSelectedFunc] = useState<string | null>(null);
  const [argsInput, setArgsInput] = useState<string>('[]');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Flatten all functions from all packages into a single list
  const allFuncs = Object.entries(deployment.packages ?? {}).flatMap(([lang, handles]) =>
    handles.flatMap(handle =>
      handle.scope.funcs.map(f => ({
        ...f,
        lang,
        handleName: handle.name,
      })),
    ),
  );

  if (allFuncs.length === 0) {
    return (
      <div className="bg-white border md:rounded-lg p-6 flex flex-col items-center justify-center text-gray-500 text-sm h-full">
        No exported functions found in this deployment.
      </div>
    );
  }

  const currentFunc = allFuncs.find(f => f.name === selectedFunc) || allFuncs[0];

  const handleTest = async () => {
    if (!currentFunc) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let parsedArgs: unknown[] = [];
      if (argsInput.trim()) {
        parsedArgs = JSON.parse(argsInput);
        if (!Array.isArray(parsedArgs)) {
          throw new Error('Arguments must be a valid JSON array.');
        }
      }

      const res = await api.call(
        deployment.prefix,
        deployment.suffix,
        deployment.version,
        currentFunc.name,
        parsedArgs,
      );
      setResult(JSON.stringify(res, null, 2));
    } catch (err: unknown) {
      setError((err as Error).message || 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white flex flex-col md:flex-row h-full max-h-[700px] overflow-hidden border-l border-gray-200">
      {/* Function List (Left) */}
      <div className="w-full md:w-[240px] shrink-0 bg-gray-50/50 flex flex-col border-b md:border-b-0 md:border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200 text-xs font-bold text-slate-800 uppercase tracking-widest bg-white sticky top-0 z-10">
          Exported Functions
        </div>
        <div className="flex flex-col">
          {allFuncs.map(func => {
            const isSelected = (selectedFunc || allFuncs[0].name) === func.name;
            return (
              <button
                key={`${func.lang}-${func.handleName}-${func.name}`}
                onClick={() => {
                  setSelectedFunc(func.name);
                  setResult(null);
                  setError(null);
                }}
                className={`text-left px-4 py-3 border-b border-gray-100 transition-colors text-[13px] font-mono truncate
                                    ${
                                      isSelected
                                        ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-l-blue-500'
                                        : 'text-slate-600 hover:bg-white border-l-2 border-l-transparent'
                                    }
                                `}
              >
                {func.name}()
              </button>
            );
          })}
        </div>
      </div>

      {/* Test Panel (Right) */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-mono">{currentFunc.name}</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Language:{' '}
              <span className="uppercase text-blue-500 font-bold">{currentFunc.lang}</span>
            </p>
          </div>
        </div>

        <div className="p-5 flex-grow flex flex-col gap-5 overflow-y-auto bg-gray-50/20">
          {/* Arguments Input */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
              Execute with Payload (JSON Array)
            </label>
            <textarea
              value={argsInput}
              onChange={e => setArgsInput(e.target.value)}
              placeholder='e.g. [1, 2, "test"]'
              className="bg-white border border-gray-300 shadow-inner px-3 py-2.5 font-mono text-xs min-h-[120px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow custom-scrollbar resize-y"
              spellCheck={false}
            />
          </div>

          {/* Action */}
          <div className="flex justify-end">
            <button
              onClick={handleTest}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white text-[13px] font-bold shadow hover:bg-slate-900 transition-colors disabled:opacity-50"
            >
              {loading ? <Spinner size={14} /> : null}
              Run Function
            </button>
          </div>

          {/* Output */}
          {(result !== null || error !== null) && (
            <div className="flex flex-col gap-2 mt-2 animate-in fade-in pt-4 border-t border-gray-200">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                Execution Result
              </label>
              <div
                className={`p-4 font-mono text-xs overflow-x-auto whitespace-pre custom-scrollbar border ${
                  error
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-slate-900 text-green-400 border-slate-800 shadow-inner'
                }`}
              >
                {error ? error : result}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
