import { MobileNav } from './mobile-nav';
import { Sidebar } from './sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-white px-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold lg:hidden">WinAut</p>
            <p className="hidden text-sm text-[var(--muted)] lg:block">
              Operação e observabilidade das automações WinThor
            </p>
          </div>
          <div className="text-xs text-[var(--muted)]">Admin</div>
        </header>
        <MobileNav />
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
