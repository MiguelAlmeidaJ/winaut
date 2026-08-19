'use client';

import { useMutation } from '@tanstack/react-query';
import type { AgentListItem, CreateAgentEnrollmentResponse } from '@winaut/contracts';
import { useState } from 'react';

import { apiClient } from '@/lib/api/client';

import { AgentActivationDialog } from '../components/agent-activation-dialog';

interface AgentOnboardingSectionProps {
  agent: AgentListItem;
}

function operationalMessage(agent: AgentListItem): string {
  if (!agent.enabled) {
    return 'Agent desabilitado. Reabilite-o antes de instalar ou reativar esta máquina.';
  }

  if (agent.online) {
    return 'Agent conectado. O backend recebeu um heartbeat recente desta instalação.';
  }

  if (!agent.lastSeenAt) {
    return 'Aguardando instalação. Gere um código de ativação e use-o no Orquestra Agent desta máquina.';
  }

  return 'Agent habilitado, porém sem heartbeat recente. Verifique o processo do Agent e a conectividade com a API.';
}

export function AgentOnboardingSection({
  agent,
}: AgentOnboardingSectionProps) {
  const [enrollment, setEnrollment] =
    useState<CreateAgentEnrollmentResponse | null>(null);

  const mutation = useMutation({
    mutationFn: () => apiClient.createAgentEnrollment(agent.id),
    onSuccess: setEnrollment,
  });

  return (
    <>
      <section className="rounded-xl border border-[var(--border)] bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Instalação do Windows Agent</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Vincule uma máquina ao Orquestra usando um código temporário de uso único.
            </p>
          </div>
          <button
            type="button"
            disabled={!agent.enabled || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="shrink-0 rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending
              ? 'Gerando...'
              : agent.lastSeenAt
                ? 'Gerar novo código'
                : 'Gerar código de ativação'}
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm">
          {operationalMessage(agent)}
        </div>

        {mutation.isError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {mutation.error.message}
          </div>
        ) : null}

        <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
          <p>
            O código expira rapidamente e só pode ser consumido uma vez. O Agent
            troca esse código por uma credencial própria e a protege localmente
            com Windows DPAPI.
          </p>
          <p>
            Hostname e versão são descobertos pela própria máquina durante a
            ativação; não precisam ser informados manualmente no painel.
          </p>
        </div>
      </section>

      {enrollment ? (
        <AgentActivationDialog
          enrollment={enrollment}
          onClose={() => setEnrollment(null)}
        />
      ) : null}
    </>
  );
}
