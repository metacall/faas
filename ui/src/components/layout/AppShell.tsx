import type { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { FloatingChat } from '@/components/ui/FloatingChat';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex flex-col min-h-screen bg-[--color-bg] relative">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-10 flex flex-col">{children}</main>
      <Footer />
      <FloatingChat />
    </div>
  );
}
