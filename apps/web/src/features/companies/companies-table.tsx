'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { StatusBadge } from '@/components/ui/status-badge';

import { companiesQueryOptions } from './queries';

function CompaniesTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
      <div className="space-y-3 p-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-10 animate-pulse rounded-md bg-[var(--surface-muted)]"
          />
        ))}
      </div>
    </div>
  );
}

export function CompaniesTable() {
  const query = useQuery(companiesQueryOptions);

  if (query.isPending) {
    return <CompaniesTableSkeleton />;
  }

  if (query.isError) {
    return (
      <ErrorState
        message={query.error.message}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (query.data.length === 0) {
    return (
      <EmptyState
        title="Nenhuma empresa cadastrada"
        description="Cadastre a primeira empresa para iniciar o provisionamento de ambientes WinThor."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border)] text-sm">
          <thead className="bg-[var(--surface-muted)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-5 py-3">Nome</th>
              <th className="px-5 py-3">Documento</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Ambientes WinThor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {query.data.map((company) => (
              <tr key={company.id} className="hover:bg-slate-50/70">
                <td className="px-5 py-4 font-medium text-[var(--foreground)]">
                  <Link
                    href={`/companies/${company.id}`}
                    className="hover:text-[var(--accent)] hover:underline"
                  >
                    {company.name}
                  </Link>
                </td>
                <td className="px-5 py-4 text-[var(--muted)]">
                  {company.document || '—'}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge active={company.active} />
                </td>
                <td className="px-5 py-4 text-right tabular-nums text-[var(--muted)]">
                  {company._count.winthorInstances}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
