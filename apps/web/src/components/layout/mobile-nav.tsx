'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'Dashboard' },
  { href: '/companies', label: 'Empresas' },
  { href: '/winthor-instances', label: 'Ambientes WinThor' },
  { href: '/agents', label: 'Agents' },
  { href: '/schedules', label: 'Agendamentos' },
  { href: '/runs', label: 'Execuções' },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-2 overflow-x-auto border-b border-[var(--border)] bg-white px-4 py-2 lg:hidden"
      aria-label="Principal"
    >
      {items.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm ${
              active
                ? 'bg-[var(--surface-muted)] font-medium text-[var(--foreground)]'
                : 'text-[var(--muted)]'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
