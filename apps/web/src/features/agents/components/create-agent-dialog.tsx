'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateAgentResponse } from '@winaut/contracts';
import type { FormEvent } from 'react';
import { useState } from 'react';

import { apiClient } from '@/lib/api/client';
import {
  winThorInstanceKeys,
  winThorInstancesQueryOptions,
} from '@/features/winthor-instances/queries';

import { agentKeys } from '../queries';
import { OneTimeTokenDialog } from './one-time-token-dialog';

export function CreateAgentDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<CreateAgentResponse | null>(null);
  const [winthorInstanceId, setWinthorInstanceId] = useState('');
  const [name, setName] = useState('');
  const [hostname, setHostname] = useState('');
  const [version, setVersion] = useState('');

  const instancesQuery = useQuery({
    ...winThorInstancesQueryOptions,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.createAgent({
        winthorInstanceId,
        name: name.trim(),
        hostname: hostname.trim(),
        ...(version.trim() ? { version: version.trim() } : {}),
      }),
    onSuccess: async (response) => {
      setCreated(response);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: agentKeys.all }),
        queryClient.invalidateQueries({ queryKey: winThorInstanceKeys.all }),
        queryClient.invalidateQueries({
          queryKey: winThorInstanceKeys.detail(response.agent.winthorInstanceId),
        }),
      ]);
    },
  });

  const activeInstances =
    instancesQuery.data?.filter((instance) => instance.active) ?? [];

  function close() {
    setOpen(false);
    setCreated(null);
    setWinthorInstanceId('');
    setName('');
    setHostname('');
    setVersion('');
    mutation.reset();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!winthorInstanceId || !name.trim() || !hostname.trim()) {
      return;
    }
    mutation.mutate();
  }

  if (created) {
    return (
      <OneTimeTokenDialog
        title={`Credencial criada para ${created.agent.name}`}
        token={created.credential.token}
        warning={created.credential.warning}
        onClose={close}
      />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Novo Agent
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-agent-title"
            className="w-full max-w-xl rounded-xl border border-[var(--border)] bg-white p-6 shadow-xl"
          >
            <h2 id="create-agent-title" className="text-lg font-semibold">
              Novo Agent
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Cadastre o Windows Agent no ambiente WinThor que ele poderá atender.
            </p>

            {instancesQuery.isPending ? (
              <div className="mt-6 h-36 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
            ) : instancesQuery.isError ? (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {instancesQuery.error.message}
              </div>
            ) : activeInstances.length === 0 ? (
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Cadastre ou ative um Ambiente WinThor antes de criar um Agent.
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={submit}>
                <label className="block text-sm font-medium">
                  Ambiente WinThor
                  <select
                    required
                    value={winthorInstanceId}
                    onChange={(event) => setWinthorInstanceId(event.target.value)}
                    className="mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">Selecione um ambiente</option>
                    {activeInstances.map((instance) => (
                      <option key={instance.id} value={instance.id}>
                        {instance.company.name} · {instance.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium">
                  Nome
                  <input
                    required
                    maxLength={150}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Agent Produção"
                    className="mt-1 block w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Hostname
                  <input
                    required
                    maxLength={255}
                    value={hostname}
                    onChange={(event) => setHostname(event.target.value)}
                    placeholder="SRV-WINTHOR-01"
                    className="mt-1 block w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Versão <span className="font-normal text-[var(--muted)]">(opcional)</span>
                  <input
                    maxLength={50}
                    value={version}
                    onChange={(event) => setVersion(event.target.value)}
                    placeholder="0.1.0"
                    className="mt-1 block w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </label>

                {mutation.isError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {mutation.error.message}
                  </div>
                ) : null}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={close}
                    disabled={mutation.isPending}
                    className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)] disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {mutation.isPending ? 'Cadastrando...' : 'Cadastrar Agent'}
                  </button>
                </div>
              </form>
            )}

            {!instancesQuery.isPending &&
            (instancesQuery.isError || activeInstances.length === 0) ? (
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
                >
                  Fechar
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
