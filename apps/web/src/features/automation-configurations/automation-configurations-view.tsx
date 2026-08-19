'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { ErrorState } from '@/components/ui/error-state';
import { companiesQueryOptions } from '@/features/companies/queries';
import { winThorInstancesQueryOptions } from '@/features/winthor-instances/queries';

import { BranchesPanel } from './branches-panel';
import { CompanyAutomationsPanel } from './company-automations-panel';
import {
  companyAutomationsQueryOptions,
} from './queries';
import { Routine507Panel } from './routine-507-panel';

export function AutomationConfigurationsView() {
  const companiesQuery = useQuery(companiesQueryOptions);
  const instancesQuery = useQuery(winThorInstancesQueryOptions);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedInstanceId, setSelectedInstanceId] = useState('');

  const companies = useMemo(
    () =>
      [...(companiesQuery.data ?? [])].sort((left, right) =>
        left.name.localeCompare(right.name, 'pt-BR'),
      ),
    [companiesQuery.data],
  );

  const effectiveCompanyId =
    selectedCompanyId || companies[0]?.id || '';

  const companyAutomationsQuery = useQuery(
    companyAutomationsQueryOptions(effectiveCompanyId),
  );

  const companyInstances = useMemo(
    () =>
      [...(instancesQuery.data ?? [])]
        .filter(
          (instance) => instance.company.id === effectiveCompanyId,
        )
        .sort((left, right) =>
          left.name.localeCompare(right.name, 'pt-BR'),
        ),
    [effectiveCompanyId, instancesQuery.data],
  );

  const selectedInstanceIsValid = companyInstances.some(
    (instance) => instance.id === selectedInstanceId,
  );
  const effectiveInstanceId = selectedInstanceIsValid
    ? selectedInstanceId
    : companyInstances[0]?.id ?? '';

  if (companiesQuery.isPending || instancesQuery.isPending) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-white p-6 text-sm text-[var(--muted)]">
        Carregando empresas e ambientes WinThor...
      </div>
    );
  }

  if (companiesQuery.isError) {
    return (
      <ErrorState
        message={companiesQuery.error.message}
        onRetry={() => void companiesQuery.refetch()}
      />
    );
  }

  if (instancesQuery.isError) {
    return (
      <ErrorState
        message={instancesQuery.error.message}
        onRetry={() => void instancesQuery.refetch()}
      />
    );
  }

  if (companies.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-white p-6">
        <p className="font-medium">Nenhuma empresa cadastrada</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Cadastre uma empresa antes de habilitar automações.
        </p>
      </div>
    );
  }

  const enabledCodes = new Set(
    companyAutomationsQuery.data?.automations
      .filter((automation) => automation.enabled)
      .map((automation) => automation.code) ?? [],
  );
  const routine507Enabled = enabledCodes.has('507');
  const routine552Enabled = enabledCodes.has('552');

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[var(--border)] bg-white p-4">
        <label
          htmlFor="configuration-company"
          className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]"
        >
          Empresa
        </label>
        <select
          id="configuration-company"
          value={effectiveCompanyId}
          onChange={(event) => {
            setSelectedCompanyId(event.target.value);
            setSelectedInstanceId('');
          }}
          className="mt-2 block w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        >
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
              {company.active ? '' : ' · Inativa'}
            </option>
          ))}
        </select>
      </section>

      {companyAutomationsQuery.isPending ? (
        <section className="rounded-xl border border-[var(--border)] bg-white p-5 text-sm text-[var(--muted)]">
          Carregando automações da empresa...
        </section>
      ) : companyAutomationsQuery.isError ? (
        <ErrorState
          message={companyAutomationsQuery.error.message}
          onRetry={() => void companyAutomationsQuery.refetch()}
        />
      ) : (
        <CompanyAutomationsPanel
          catalog={companyAutomationsQuery.data}
        />
      )}

      {companyAutomationsQuery.data &&
      (routine507Enabled || routine552Enabled) ? (
        <section className="rounded-xl border border-[var(--border)] bg-white p-4">
          <label
            htmlFor="configuration-environment"
            className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]"
          >
            Ambiente WinThor
          </label>

          {companyInstances.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Esta empresa ainda não possui Ambiente WinThor cadastrado.
            </p>
          ) : (
            <select
              id="configuration-environment"
              value={effectiveInstanceId}
              onChange={(event) =>
                setSelectedInstanceId(event.target.value)
              }
              className="mt-2 block w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            >
              {companyInstances.map((instance) => (
                <option key={instance.id} value={instance.id}>
                  {instance.name}
                  {instance.active ? '' : ' · Inativo'}
                </option>
              ))}
            </select>
          )}
        </section>
      ) : null}

      {routine507Enabled && effectiveInstanceId ? (
        <div>
          <div className="mb-3">
            <h2 className="text-base font-semibold">
              Configuração da rotina 507
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Filiais e geração dinâmica de etapas para o ambiente
              selecionado.
            </p>
          </div>
          <div className="grid gap-5 xl:grid-cols-[minmax(300px,0.75fr)_minmax(0,1.6fr)]">
            <BranchesPanel winthorInstanceId={effectiveInstanceId} />
            <Routine507Panel
              key={effectiveInstanceId}
              winthorInstanceId={effectiveInstanceId}
            />
          </div>
        </div>
      ) : null}

      {routine552Enabled ? (
        <section className="rounded-xl border border-[var(--border)] bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[var(--surface-muted)] px-2 py-1 font-mono text-xs font-semibold">
                  552
                </span>
                <h2 className="font-semibold">Rotina 552 habilitada</h2>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                A 552 não possui parâmetros adicionais no painel neste
                momento. O ambiente é definido no agendamento.
              </p>
            </div>
            <Link
              href="/schedules"
              className="shrink-0 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
            >
              Ver agendamentos
            </Link>
          </div>
        </section>
      ) : null}

      {companyAutomationsQuery.data &&
      !routine507Enabled &&
      !routine552Enabled ? (
        <section className="rounded-xl border border-dashed border-[var(--border)] bg-white p-6">
          <p className="font-medium">
            Nenhuma automação habilitada para esta empresa
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Ative a 507 e/ou a 552 acima conforme o escopo deste cliente.
          </p>
        </section>
      ) : null}
    </div>
  );
}
