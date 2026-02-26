import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, Moon } from 'lucide-react';

export function Navbar() {
    const navigate = useNavigate();

    return (
        <header className="w-full border-b border-[--color-border] bg-[--color-surface] sticky top-0 z-50">
            <div className="w-full max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

                {/* Logo — exact match to production screenshot */}
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2.5 bg-transparent border-none p-0 cursor-pointer"
                >
                    <img
                        src="/metacall.svg"
                        alt="MetaCall"
                        className="h-7 w-auto"
                    />
                    <div className="flex flex-col leading-none">
                        <span className="text-sm font-bold tracking-[0.15em] uppercase text-[--color-text-primary]">
                            MetaCall
                        </span>
                        <span className="text-[10px] text-[--color-primary] font-mono mt-0.5">
                            v0.6.0
                        </span>
                    </div>
                </button>

                {/* Right nav buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/settings')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[--color-text-muted] border border-[--color-border] bg-[--color-surface] hover:text-[--color-text-primary] hover:border-[--color-text-muted] transition-all"
                    >
                        Settings
                        <Settings size={14} />
                    </button>

                    <button
                        onClick={() => navigate('/deployments')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[--color-text-muted] border border-[--color-border] bg-[--color-surface] hover:text-red-500 hover:border-red-300 transition-all"
                    >
                        Logout
                        <LogOut size={14} />
                    </button>

                    <button
                        className="p-1.5 text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors border border-transparent hover:border-[--color-border]"
                        title="Toggle theme"
                    >
                        <Moon size={15} />
                    </button>
                </div>
            </div>
        </header>
    );
}
