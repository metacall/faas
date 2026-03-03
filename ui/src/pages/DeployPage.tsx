import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderArchive,
  ArrowRight,
  CheckCircle,
  UploadCloud,
  FolderSync,
  GitBranch,
} from 'lucide-react';
import { Plans } from '@metacall/protocol/plan';

export default function DeployHubPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [plan] = useState<Plans>(Plans.Essential);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      navigate('/deploy/wizard', { state: { file, plan } });
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.zip') || file.type.includes('zip'))) {
      navigate('/deploy/wizard', { state: { file, plan } });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };

  return (
    <div className="grow flex flex-col items-center justify-start p-6 pt-20 relative overflow-hidden animate-in fade-in duration-500 min-h-[calc(100vh-80px)] bg-slate-50/50">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[10%] w-125 h-125 bg-[--color-primary]/2 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-125 h-125 bg-blue-500/2 rounded-full blur-[80px]"></div>
      </div>

      <div className="max-w-4xl w-full z-10 flex flex-col gap-10">
        <div className="text-center mb-6">
          <h1 className="text-[28px] font-bold text-slate-900 mb-3 tracking-tight">
            New Deployment
          </h1>
          <p className="text-slate-500">Choose how you want to deploy your function</p>
        </div>

        {/* Deployment Source Selection */}
        <div className="grid md:grid-cols-2 gap-8 max-w-200 mx-auto w-full">
          {/* Deploy Repository */}
          <button
            onClick={() => navigate('/deploy/repository')}
            className="text-left group relative flex items-center justify-between sm:block bg-white border border-blue-400 sm:border-gray-900 p-4 sm:p-8 transition-all duration-300 hover:border-blue-500 shadow-sm hover:shadow-md"
          >
            {/* Mobile left-aligned content */}
            <div className="flex items-center gap-3 sm:hidden">
              <h2 className="text-lg font-bold text-blue-500">Deploy Repository</h2>
            </div>
            {/* Mobile right-aligned icon */}
            <div className="flex sm:hidden">
              <GitBranch className="text-blue-500" size={24} strokeWidth={1.5} />
            </div>

            {/* Desktop absolute arrow */}
            <div className="hidden sm:block absolute top-10 right-8 p-0 opacity-20 group-hover:opacity-100 transition-opacity">
              <ArrowRight
                className="text-blue-500 group-hover:text-blue-500 transition-colors"
                size={28}
                strokeWidth={1.5}
              />
            </div>

            {/* Desktop full content */}
            <div className="hidden sm:flex flex-col h-full justify-between">
              <div>
                <div className="w-12 h-12 mb-6 flex items-center justify-center bg-gray-50/50 border border-gray-100 transition-colors">
                  <FolderSync
                    className="text-slate-700 group-hover:text-blue-500"
                    size={24}
                    strokeWidth={1.5}
                  />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2 transition-colors">
                  Deploy Repository
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed max-w-70">
                  Connect your Git provider to import an existing project from a Git repository.
                </p>
              </div>
              <div className="mt-10 pt-6 border-t border-gray-100 flex items-center text-[13px] font-semibold text-slate-500 transition-colors">
                <span>Supports GitHub, GitLab &amp; Bitbucket</span>
              </div>
            </div>
          </button>

          {/* Deploy Zip */}
          <label
            className="cursor-pointer text-left group relative flex items-center justify-between sm:block bg-white border border-blue-400 border-dashed sm:border-gray-900 sm:border-dashed p-4 sm:p-8 transition-all duration-300 hover:border-blue-500 shadow-sm hover:shadow-md"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Mobile left-aligned content */}
            <div className="flex flex-col gap-0.5 sm:hidden">
              <h2 className="text-lg font-bold text-blue-500">Deploy Zip</h2>
              <span className="flex items-center gap-1 text-[11px] font-bold text-blue-500">
                <CheckCircle size={10} strokeWidth={3} className="text-green-500" />
                Drag &amp; Drop enabled.
              </span>
            </div>
            {/* Mobile right-aligned icon */}
            <div className="flex sm:hidden">
              <FolderArchive className="text-blue-500" size={24} strokeWidth={1.5} />
            </div>

            {/* Desktop absolute arrow */}
            <div className="hidden sm:block absolute top-10 right-8 p-0 opacity-20 group-hover:opacity-100 transition-opacity">
              <UploadCloud
                className="text-blue-500 group-hover:text-blue-500 transition-colors"
                size={28}
                strokeWidth={1.5}
              />
            </div>

            {/* Desktop full content */}
            <div className="hidden sm:flex flex-col h-full justify-between">
              <div>
                <div className="w-12 h-12 mb-6 flex items-center justify-center bg-gray-50/50 border border-gray-100 transition-colors">
                  <FolderArchive
                    className="text-slate-700 group-hover:text-blue-500"
                    size={24}
                    strokeWidth={1.5}
                  />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2 transition-colors">
                  Deploy Zip
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed max-w-70">
                  Upload a zip file containing your function code and configuration manually.
                </p>
              </div>
              <div className="mt-10 pt-6 border-t border-gray-100 flex items-center gap-2 text-[13px] font-semibold text-slate-500 transition-colors">
                <CheckCircle size={16} strokeWidth={2} />
                <span>Drag &amp; Drop enabled</span>
              </div>
            </div>
          </label>
        </div>

        {/* Help */}
        <div className="text-center">
          <p className="text-xs text-slate-400">
            Need help? Check out our{' '}
            <a
              className="text-slate-500 font-medium hover:underline hover:text-blue-500 transition-colors"
              href="https://metacall.io/docs"
              target="_blank"
              rel="noreferrer"
            >
              documentation
            </a>{' '}
            or join our{' '}
            <a
              className="text-slate-500 font-medium hover:underline hover:text-blue-500 transition-colors"
              href="https://github.com/metacall"
              target="_blank"
              rel="noreferrer"
            >
              community
            </a>
            .
          </p>
        </div>
      </div>

      {/* Floating chat icon */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => navigate('/chat')}
          aria-label="Open chat"
          className="w-12 h-12 flex items-center justify-center bg-white border border-gray-200 shadow-sm text-[--color-primary] hover:text-blue-500 rounded-full transition-all duration-200 group"
        >
          <svg
            className="w-6 h-6 group-hover:scale-110 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="square"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
