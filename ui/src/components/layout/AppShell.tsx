import type { ReactNode } from 'react';
import { Navbar } from './Navbar';

interface AppShellProps {
    children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    return (
        <div className="flex flex-col min-h-full bg-[--color-bg]">
            <Navbar />
            <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-10">
                {children}
            </main>
        </div>
    );
}
