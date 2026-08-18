'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  AgentCredentialListItem,
  CreateAgentCredentialResponse,
} from '@winaut/contracts';
import { useState } from 'react';

import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiClient } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format-date';

import { agentKeys } from '../queries';
import { ConfirmDialog } from '../components/confirm-dialog';
import { OneTimeTokenDialog } from '../components/one-time-token-dialog';

interface AgentCredentialsSectionProps {
  agentId: string;
  credentials: AgentCredentialListItem[];
  timeZone: string;
}

export function AgentCredentialsSection({
  agentId,
  credentials,
  timeZone,
}: AgentCredentialsSectionProps) {
  const queryClient = useQueryClient();
  const [createdCredential, setCreatedCredential] =
    useState<CreateAgentCredentialResponse | null>(null);
  const [credentialToRevoke, setCredentialToRevoke] = useState<string | null>(
    null,
  );

  const createMutation = useMutation({
    mutationFn: () => apiClient.createAgentCredential(agentId),
    onSuccess: async (response) => {
      setCreatedCredential(response);
      await queryClient.invalidateQueries({
        queryKey: agentKeys.credentials(agentId),
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (credentialId: string) =>
      apiClient.revokeAgentCredential(agentId, credentialId),
    onSuccess: async () => {
      setCredentialToRevoke(null);
      await queryClient.invalidateQueries({
        queryKey: agentKeys.credentials(agentId),
      });
    },
  });

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Credenciais</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Apenas metadata segura é exibida. Tokens e hashes nunca são recuperados nesta tela.
            </p>
          </div>
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="shrink-0 rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createMutation.isPending ? 'Gerando...' : 'Gerar nova credencial'}
          </button>
        </div>

        {createMutation.isError ? (
          <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
            {createMutation.error.message}
          </div>
        ) : null}

        {revokeMutation.isError ? (
          <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
            {revokeMutation.error.message}
          </div>
        ) : null}

        {credentials.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Nenhuma credencial cadastrada"
              description="Gere uma credencial para permitir que este Agent se autentique na API."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border)] text-sm">
              <thead className="bg-[var(--surface-muted)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-3">Criada em</th>
                  <th className="px-5 py-3">Último uso</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {credentials.map((credential) => {
                  const active = credential.revokedAt === null;

                  return (
                    <tr key={credential.id}>
                      <td className="px-5 py-4 text-[var(--muted)]">
                        {formatDateTime(credential.createdAt, timeZone)}
                      </td>
                      <td className="px-5 py-4 text-[var(--muted)]">
                        {formatDateTime(credential.lastUsedAt, timeZone)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge
                          active={active}
                          activeLabel="Ativa"
                          inactiveLabel="Revogada"
                        />
                      </td>
                      <td className="px-5 py-4 text-right">
                        {active ? (
                          <button
                            type="button"
                            onClick={() => setCredentialToRevoke(credential.id)}
                            className="text-sm font-medium text-red-700 hover:underline"
                          >
                            Revogar
                          </button>
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {createdCredential ? (
        <OneTimeTokenDialog
          title="Nova credencial criada"
          token={createdCredential.token}
          warning={createdCredential.warning}
          onClose={() => setCreatedCredential(null)}
        />
      ) : null}

      {credentialToRevoke ? (
        <ConfirmDialog
          title="Revogar credencial?"
          description="O Agent deixará de conseguir autenticar usando este token. A operação não revela nem recupera o token existente."
          confirmLabel="Revogar credencial"
          pending={revokeMutation.isPending}
          onCancel={() => setCredentialToRevoke(null)}
          onConfirm={() => revokeMutation.mutate(credentialToRevoke)}
        />
      ) : null}
    </>
  );
}
