import { useNavigate } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';

const navBtnStyle = {
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-grey)',
    background: 'transparent',
} as React.CSSProperties;

function hoverOn(e: React.MouseEvent<HTMLButtonElement>) {
    e.currentTarget.style.background = 'var(--color-text-primary)';
    e.currentTarget.style.color = '#ffffff';
    e.currentTarget.style.borderColor = 'var(--color-text-primary)';
}
function hoverOff(e: React.MouseEvent<HTMLButtonElement>) {
    e.currentTarget.style.background = 'transparent';
    e.currentTarget.style.color = 'var(--color-text-muted)';
    e.currentTarget.style.borderColor = 'var(--color-grey)';
}

export function Navbar() {
    const navigate = useNavigate();

    return (
        <header className="w-full bg-[--color-surface] sticky top-0 z-50">
            <div
                className="flex items-baseline justify-between w-full mx-auto px-4"
                style={{ height: '8rem', padding: '1rem', maxWidth: '1200px' }}
            >
                {/* Logo */}
                <button
                    onClick={() => navigate('/')}
                    className="flex flex-col items-start cursor-pointer bg-transparent border-none p-0 self-center"
                >
                    <img src="/metacall.svg" alt="MetaCall" className="h-10 w-auto" />
                    <span className="font-mono leading-none mt-1" style={{ fontSize: '10px', color: 'var(--color-primary)' }}>
                        v0.6.0
                    </span>
                </button>

                {/* Right nav */}
                <div className="flex items-center gap-3 self-center">
                    <button
                        onClick={() => navigate('/settings')}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-150"
                        style={navBtnStyle}
                        onMouseEnter={hoverOn}
                        onMouseLeave={hoverOff}
                    >
                        Settings
                        <Settings size={15} strokeWidth={1.8} />
                    </button>

                    <button
                        onClick={() => navigate('/deployments')}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-150"
                        style={navBtnStyle}
                        onMouseEnter={hoverOn}
                        onMouseLeave={hoverOff}
                    >
                        Logout
                        <LogOut size={15} strokeWidth={1.8} />
                    </button>
                </div>
            </div>
        </header>
    );
}
