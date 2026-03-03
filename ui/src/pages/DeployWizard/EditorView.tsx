import { Plus, Trash2 } from 'lucide-react';

export function EditorView({
  selectedFiles,
  onClear,
}: {
  selectedFiles: string[];
  onClear: () => void;
}) {
  // Generate the metacall.json content block based on selected files
  const scriptsArray = selectedFiles.map(file => `    "${file}"`).join(',\n');
  let codeContent = `{\n  "language_id": "node",\n  "path": ".",\n  "scripts": [\n${scriptsArray}\n  ]\n}`;
  if (selectedFiles.length === 0) {
    codeContent = `{\n  "language_id": "node",\n  "path": ".",\n  "scripts": []\n}`;
  }

  const lines = codeContent.split('\n');

  return (
    <div className="flex flex-col border border-gray-200 mt-2 bg-white flex-grow h-full max-h-[400px]">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center">
          <button className="px-4 py-2 bg-gray-100 text-gray-700 text-[13px] font-medium border-b border-gray-200">
            TypeScript
          </button>
          <button className="px-4 py-2 bg-blue-500 text-white text-[13px] font-semibold flex items-center gap-1">
            MC-0
          </button>
          <button
            className="px-3 py-2 text-gray-500 hover:bg-gray-200 transition-colors"
            onClick={() =>
              alert(
                'Inline file creation is currently under development. Please add files directly to your zip archive before uploading.',
              )
            }
            title="Add file (coming soon)"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="px-2">
          <button
            onClick={onClear}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors tooltip"
            title="Clear Configuration"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Code Context */}
      <div className="flex-grow flex flex-col overflow-hidden bg-white">
        <div className="px-4 py-3 pb-1 font-bold text-sm text-slate-700">metacall-0.json</div>
        <div className="flex text-[13px] font-mono leading-relaxed bg-white h-full overflow-y-auto w-full custom-scrollbar py-3">
          {/* Line numbers */}
          <div className="flex flex-col text-gray-400 px-4 text-right select-none bg-white border-r border-gray-100 min-w-[3rem]">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          {/* Code */}
          <div className="flex flex-col text-slate-800 whitespace-pre px-4">
            {lines.map((line, idx) => {
              // Basic syntax highlighting for the mock
              const highlighted = line
                .replace(/"([^"]+)"(?=:)/g, '<span class="text-blue-600">"$1"</span>') // keys
                .replace(/: "([^"]+)"/g, ': <span class="text-green-600">"$1"</span>') // values
                .replace(/ {4}"([^"]+)"/g, '    <span class="text-green-600">"$1"</span>'); // array items

              return <div key={idx} dangerouslySetInnerHTML={{ __html: highlighted || ' ' }} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
