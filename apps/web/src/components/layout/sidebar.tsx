'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { OrquestraBrand } from '@/components/brand/orquestra-brand';

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
    <aside className="hidden w-[288px] shrink-0 border-r border-white/10 bg-[var(--sidebar)] text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
      <div className="flex h-[96px] items-center border-b border-white/10 px-5">
        <OrquestraBrand
          variant="white"
          className="h-auto w-[218px]"
          priority
        />
      </div>

      <nav
        className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5"
        aria-label="Principal"
      >
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
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
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      active
                        ? 'bg-[linear-gradient(135deg,var(--accent),#5130e8)] font-semibold text-white shadow-[0_8px_24px_rgb(39_60_228/28%)]'
                        : 'text-white/75 hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full transition ${
                        active
                          ? 'bg-white'
                          : 'bg-white/25 group-hover:bg-white/65'
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

      <div className="border-t border-white/10 px-5 py-5">
        <p className="text-xs font-semibold text-white">Orquestra</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-white/55">
          Seus sistemas trabalhando juntos.
        </p>
      </div>
    </aside>
  );
}
