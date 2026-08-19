'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CompanyAutomationCatalog } from '@winaut/contracts';

import { companyAutomationsApi } from '@/lib/api/client';

import { automationConfigurationKeys } from './queries';

const descriptions: Readonly<Record<string, string>> = {
  '507': 'Recálculos de giro, Giro Dia e Preço de Venda por filial.',
  '552': 'Execução da rotina 552 preservando a configuração existente.',
};

interface CompanyAutomationsPanelProps {
  catalog: CompanyAutomationCatalog;
}

export function CompanyAutomationsPanel({
  catalog,
}: CompanyAutomationsPanelProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      code,
      enabled,
    }: {
      code: string;
      enabled: boolean;
    }) =>
      companyAutomationsApi.update(
        catalog.company.id,
        code,
        { enabled },
      ),
    onSuccess: async (result) => {
      queryClient.setQueryData(
        automationConfigurationKeys.company(catalog.company.id),
        result,
      );
      await queryClient.invalidateQueries({
        queryKey: ['automation-schedules'],
      });
    },
  });

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <h2 className="font-semibold">Automações da empresa</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Habilite somente as rotinas contratadas ou necessárias para
          este cliente.
        </p>
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-2">
        {catalog.automations.map((automation) => {
          const changing =
            mutation.isPending &&
            mutation.variables?.code === automation.code;

          return (
            <div
              key={automation.code}
              className="rounded-xl border border-[var(--border)] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[var(--surface-muted)] px-2 py-1 font-mono text-xs font-semibold">
                      {automation.code}
                    </span>
                    <p className="text-sm font-semibold">
                      {automation.name}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {descriptions[automation.code] ??
                      'Automação disponível no catálogo WinAut.'}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={automation.enabled}
                  disabled={changing}
                  onClick={() =>
                    mutation.mutate({
                      code: automation.code,
                      enabled: !automation.enabled,
                    })
                  }
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                    automation.enabled
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-[var(--surface-muted)] text-[var(--muted)]'
                  }`}
                >
                  {changing
                    ? 'Salvando...'
                    : automation.enabled
                      ? 'Ativa'
                      : 'Inativa'}
                </button>
              </div>

              {!automation.enabled ? (
                <p className="mt-3 text-xs text-[var(--muted)]">
                  Agendamentos desta rotina não podem ser criados ou
                  executados enquanto ela estiver inativa.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {mutation.isError ? (
        <div className="border-t border-[var(--border)] bg-red-50 px-5 py-3 text-sm text-red-700">
          {mutation.error.message}
        </div>
      ) : null}
    </section>
  );
}
