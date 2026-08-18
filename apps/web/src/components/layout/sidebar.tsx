'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavigationItem {
  href: string;
  label: string;
  disabled?: boolean;
}

const items: readonly NavigationItem[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/companies', label: 'Empresas' },
  { href: '/winthor-instances', label: 'Ambientes WinThor' },
  { href: '/agents', label: 'Agents' },
  { href: '/schedules', label: 'Agendamentos' },
  { href: '/runs', label: 'Execuções' },
];

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/5 bg-[var(--sidebar)] text-white lg:flex lg:min-h-screen lg:flex-col">
      <div className="flex h-16 items-center border-b border-white/8 px-6">
        <div>
          <p className="text-sm font-semibold tracking-wide">WinAut</p>
          <p className="text-xs text-[var(--sidebar-muted)]">Administração</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-5" aria-label="Principal">
        {items.map((item) => {
          const active = !item.disabled && isActive(pathname, item.href);

          if (item.disabled) {
            return (
              <span
                key={item.href}
                className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2.5 text-sm text-white/40"
                title="Disponível em uma próxima etapa"
              >
                {item.label}
                <span className="text-[10px] uppercase tracking-wider">em breve</span>
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-white/10 font-medium text-white'
                  : 'text-[var(--sidebar-muted)] hover:bg-white/6 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/8 px-6 py-4 text-xs text-[var(--sidebar-muted)]">
        Painel operacional
      </div>
    </aside>
  );
}
