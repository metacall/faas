import { useState } from 'react';
import { BotMessageSquare, X } from 'lucide-react';
import { ChatInterface } from '@/pages/ChatPage';
import { useLocation } from 'react-router-dom';

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Don't show floating chat on the dedicated chat page
  if (location.pathname === '/chat') return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="w-[320px] sm:w-[380px] h-[500px] bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col mb-4 animate-in slide-in-from-bottom-5 fade-in duration-200 origin-bottom-right">
          <div className="bg-slate-900 px-4 py-3 flex justify-between items-center text-white relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-2xl rounded-full translate-x-10 -translate-y-10"></div>
            <div className="flex items-center gap-2 relative z-10">
              <BotMessageSquare size={18} className="text-blue-400" />
              <span className="font-bold tracking-wide text-[13px] uppercase">
                MetaCall Support
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors p-1 relative z-10"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
          <div className="flex-1 bg-white relative overflow-hidden flex flex-col text-sm">
            <ChatInterface />
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
          isOpen
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-600 text-white hover:bg-gray-700'
        }`}
        aria-label="Toggle Chat"
      >
        {isOpen ? <X size={24} /> : <BotMessageSquare size={26} strokeWidth={2} />}
      </button>
    </div>
  );
}
