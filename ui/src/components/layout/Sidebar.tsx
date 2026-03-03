import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Layers, PlusSquare, Settings, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/deployments', label: 'Deployments', icon: Layers, end: false },
  { to: '/deploy/new', label: 'Deploy New', icon: PlusSquare, end: false },
  { to: '/chat', label: 'Assistant', icon: MessageSquare, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
];
// we don't have a to implement sidebar items yet
function MetaCallLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="">
        <path
          d="M2 18C2 18 3 12 8 8C13 4 16 6 16 6"
          stroke="#1d4ed8"
          strokeWidth="2.5"
          strokeLinecap="square"
        />
        <path
          d="M7 18C7 18 8 12 13 8C18 4 21 6 21 6"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeLinecap="square"
        />
        <path
          d="M12 18C12 18 13 14 16 11"
          stroke="#05b2d1"
          strokeWidth="2.5"
          strokeLinecap="square"
        />
      </svg>
      <div className="flex flex-col leading-none">
        <span className="text-xs font-bold tracking-[0.2em] uppercase text-[--color-text-primary]">
          MetaCall
        </span>
        <span className="text-[10px] text-[--color-primary] font-mono mt-0.5 opacity-80">
          v0.1.0
        </span>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col bg-[--color-surface] border-r border-[--color-border]">
      <div className="flex items-center px-5 py-4 border-b border-[--color-border]">
        <MetaCallLogo />
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#f0fafe] text-[--color-primary]'
                  : 'text-[--color-text-muted] hover:bg-[--color-elevated] hover:text-[--color-text-primary]',
              )
            }
          >
            <Icon size={15} className="shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-[--color-border]">
        <span className="text-[10px] text-[--color-text-muted] font-mono">
          FaaS Local Dashboard
        </span>
      </div>
    </aside>
  );
}
