'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AgentListItem } from '@winaut/contracts';
import { useState } from 'react';

import { winThorInstanceKeys } from '@/features/winthor-instances/queries';
import { apiClient } from '@/lib/api/client';

import { ConfirmDialog } from '../components/confirm-dialog';
import { agentKeys } from '../queries';

interface AgentLifecycleActionsProps {
  agent: AgentListItem;
}

export function AgentLifecycleActions({ agent }: AgentLifecycleActionsProps) {
  const queryClient = useQueryClient();
  const [confirmDisable, setConfirmDisable] = useState(false);

  const mutation = useMutation({
    mutationFn: (enabled: boolean) =>
      apiClient.updateAgent(agent.id, { enabled }),
    onSuccess: async () => {
      setConfirmDisable(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: agentKeys.all }),
        queryClient.invalidateQueries({ queryKey: agentKeys.detail(agent.id) }),
        queryClient.invalidateQueries({
          queryKey: winThorInstanceKeys.detail(agent.winthorInstanceId),
        }),
      ]);
    },
  });

  if (!agent.enabled) {
    return (
      <div className="flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => mutation.mutate(true)}
          disabled={mutation.isPending}
          className="rounded-md bg-[var(--foreground)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? 'Habilitando...' : 'Habilitar Agent'}
        </button>
        {mutation.isError ? (
          <span className="max-w-72 text-right text-xs text-red-700">
            {mutation.error.message}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => {
            mutation.reset();
            setConfirmDisable(true);
          }}
          disabled={mutation.isPending}
          className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Desabilitar Agent
        </button>
        {mutation.isError ? (
          <span className="max-w-72 text-right text-xs text-red-700">
            {mutation.error.message}
          </span>
        ) : null}
      </div>

      {confirmDisable ? (
        <ConfirmDialog
          title={`Desabilitar ${agent.name}?`}
          description="Chamadas autenticadas deste Agent serão recusadas imediatamente. As credenciais permanecem cadastradas e poderão voltar a ser usadas quando o Agent for habilitado novamente."
          confirmLabel="Desabilitar Agent"
          pendingLabel="Desabilitando..."
          pending={mutation.isPending}
          onCancel={() => {
            setConfirmDisable(false);
            mutation.reset();
          }}
          onConfirm={() => mutation.mutate(false)}
        />
      ) : null}
    </>
  );
}
