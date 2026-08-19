'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavigationItem {
  href: string;
  label: string;
}

interface NavigationSection {
  label: string;
  items: readonly NavigationItem[];
}

const sections: readonly NavigationSection[] = [
  {
    label: 'Visão geral',
    items: [{ href: '/', label: 'Dashboard' }],
  },
  {
    label: 'Estrutura',
    items: [
      { href: '/companies', label: 'Empresas' },
      { href: '/winthor-instances', label: 'Ambientes WinThor' },
      { href: '/agents', label: 'Agents' },
    ],
  },
  {
    label: 'Automação',
    items: [
      { href: '/automation-configurations', label: 'Configurações' },
      { href: '/schedules', label: 'Agendamentos' },
      { href: '/runs', label: 'Execuções' },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[272px] shrink-0 border-r border-white/5 bg-[var(--sidebar)] text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
      <div className="flex h-[72px] items-center border-b border-white/8 px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[11px] font-bold text-[var(--sidebar)]">
            WA
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide">WinAut</p>
            <p className="mt-0.5 text-xs text-[var(--sidebar-muted)]">
              Automação WinThor
            </p>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5" aria-label="Principal">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              {section.label}
            </p>
            <div className="mt-2 space-y-1">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? 'bg-white/10 font-medium text-white'
                        : 'text-[var(--sidebar-muted)] hover:bg-white/6 hover:text-white'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full transition ${
                        active ? 'bg-white' : 'bg-white/20 group-hover:bg-white/50'
                      }`}
                      aria-hidden="true"
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/8 px-5 py-4">
        <p className="text-xs font-medium text-white/70">Ambiente administrativo</p>
        <p className="mt-1 text-[11px] text-[var(--sidebar-muted)]">
          Operação e observabilidade
        </p>
      </div>
    </aside>
  );
}
