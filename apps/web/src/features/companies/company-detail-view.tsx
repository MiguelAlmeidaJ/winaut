'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { CreateWinThorInstanceDialog } from '@/features/winthor-instances/create-winthor-instance-dialog';
import {
  formatExecutionMode,
  formatHostingType,
} from '@/features/winthor-instances/formatters';

import { companyQueryOptions } from './queries';

interface CompanyDetailViewProps {
  companyId: string;
}

export function CompanyDetailView({ companyId }: CompanyDetailViewProps) {
  const query = useQuery(companyQueryOptions(companyId));

  if (query.isPending) {
    return (
      <div className="space-y-5">
        <div className="h-5 w-32 animate-pulse rounded bg-[var(--surface-muted)]" />
        <div className="h-24 animate-pulse rounded-xl bg-[var(--surface-muted)]" />
        <div className="h-56 animate-pulse rounded-xl bg-[var(--surface-muted)]" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="space-y-4">
        <BackToCompanies />
        <ErrorState
          message={query.error.message}
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  const company = query.data;

  return (
    <div className="space-y-6">
      <BackToCompanies />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--muted)]">Empresa</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {company.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {company.document || 'Documento não informado'}
          </p>
        </div>
        <StatusBadge active={company.active} />
      </div>

      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Ambientes WinThor</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Ambientes lógicos pertencentes exclusivamente a esta empresa.
            </p>
          </div>
          {company.active ? (
            <CreateWinThorInstanceDialog initialCompanyId={company.id} />
          ) : null}
        </div>

        {company.winthorInstances.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Nenhum ambiente WinThor"
              description="Cadastre o primeiro ambiente desta empresa para continuar o provisionamento."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border)] text-sm">
              <thead className="bg-[var(--surface-muted)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-3">Ambiente</th>
                  <th className="px-5 py-3">Hospedagem</th>
                  <th className="px-5 py-3">Execução</th>
                  <th className="px-5 py-3">Timezone</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {company.winthorInstances.map((instance) => (
                  <tr key={instance.id}>
                    <td className="px-5 py-4 font-medium">
                      <Link
                        href={`/winthor-instances/${instance.id}`}
                        className="hover:text-[var(--accent)] hover:underline"
                      >
                        {instance.name}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-[var(--muted)]">
                      {formatHostingType(instance.hostingType)}
                    </td>
                    <td className="px-5 py-4 text-[var(--muted)]">
                      {formatExecutionMode(instance.executionMode)}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-[var(--muted)]">
                      {instance.timeZone}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge active={instance.active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function BackToCompanies() {
  return (
    <Link
      href="/companies"
      className="inline-flex text-sm font-medium text-[var(--accent)] hover:underline"
    >
      ← Voltar para Empresas
    </Link>
  );
}
