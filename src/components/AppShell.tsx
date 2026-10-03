import { type ReactNode } from 'react';
import { PrimaryNavigation } from './PrimaryNavigation';
import { AddFAB } from './AddFAB';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gallery-950 text-gallery-100">
      <main className="flex-1 pb-20 lg:pb-0 lg:pt-14">
        {children}
      </main>
      <PrimaryNavigation />
      <AddFAB />
    </div>
  );
}
