'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'Dashboard' },
  { href: '/companies', label: 'Empresas' },
  { href: '/winthor-instances', label: 'Ambientes' },
  { href: '/agents', label: 'Agents' },
  { href: '/schedules', label: 'Agendamentos' },
  { href: '/runs', label: 'Execuções' },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1.5 overflow-x-auto border-b border-[var(--border)] bg-white px-4 py-2.5 lg:hidden"
      aria-label="Principal"
    >
      {items.map((item) => {
        const active =
          item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition ${
              active
                ? 'bg-[var(--foreground)] text-white'
                : 'text-[var(--muted)] hover:bg-[var(--surface-muted)]'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
