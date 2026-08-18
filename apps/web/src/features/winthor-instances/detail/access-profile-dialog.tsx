'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  WinThorAccessProfileItem,
  WinThorExecutionMode,
} from '@winaut/contracts';
import type { FormEvent } from 'react';
import { useState } from 'react';

import { apiClient } from '@/lib/api/client';

import { executionModeOptions } from '../options';
import { winThorInstanceKeys } from '../queries';

interface AccessProfileDialogProps {
  winthorInstanceId: string;
  defaultType: WinThorExecutionMode;
  profile?: WinThorAccessProfileItem;
  triggerLabel?: string;
}

export function AccessProfileDialog({
  winthorInstanceId,
  defaultType,
  profile,
  triggerLabel = 'Novo perfil',
}: AccessProfileDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<WinThorExecutionMode>(
    profile?.type ?? defaultType,
  );
  const [endpoint, setEndpoint] = useState(profile?.endpoint ?? '');
  const [applicationName, setApplicationName] = useState(
    profile?.applicationName ?? '',
  );
  const [username, setUsername] = useState(profile?.username ?? '');
  const [secretReference, setSecretReference] = useState(
    profile?.secretReference ?? '',
  );
  const [enabled, setEnabled] = useState(profile?.enabled ?? true);

  const mutation = useMutation({
    mutationFn: () => {
      if (profile) {
        return apiClient.updateWinThorAccessProfile(profile.id, {
          type,
          endpoint: endpoint.trim() || null,
          applicationName: applicationName.trim() || null,
          username: username.trim() || null,
          secretReference: secretReference.trim() || null,
          enabled,
        });
      }

      return apiClient.createWinThorAccessProfile({
        winthorInstanceId,
        type,
        ...(endpoint.trim() ? { endpoint: endpoint.trim() } : {}),
        ...(applicationName.trim()
          ? { applicationName: applicationName.trim() }
          : {}),
        ...(username.trim() ? { username: username.trim() } : {}),
        ...(secretReference.trim()
          ? { secretReference: secretReference.trim() }
          : {}),
        enabled,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: winThorInstanceKeys.detail(winthorInstanceId),
        }),
        queryClient.invalidateQueries({ queryKey: winThorInstanceKeys.all }),
      ]);
      setOpen(false);
    },
  });

  function openDialog() {
    setType(profile?.type ?? defaultType);
    setEndpoint(profile?.endpoint ?? '');
    setApplicationName(profile?.applicationName ?? '');
    setUsername(profile?.username ?? '');
    setSecretReference(profile?.secretReference ?? '');
    setEnabled(profile?.enabled ?? true);
    mutation.reset();
    setOpen(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={
          profile
            ? 'text-sm font-medium text-[var(--accent)] hover:underline'
            : 'rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]'
        }
      >
        {triggerLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="access-profile-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--border)] bg-white p-6 shadow-xl"
          >
            <h2 id="access-profile-title" className="text-lg font-semibold">
              {profile ? 'Editar perfil de acesso' : 'Novo perfil de acesso'}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Informe somente metadata de conexão. Não coloque senha, token ou
              outro segredo em plaintext.
            </p>

            <form className="mt-6 space-y-4" onSubmit={submit}>
              <label className="block text-sm font-medium">
                Tipo
                <select
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value as WinThorExecutionMode)
                  }
                  className="mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                >
                  {executionModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium">
                Endpoint
                <input
                  maxLength={500}
                  value={endpoint}
                  onChange={(event) => setEndpoint(event.target.value)}
                  placeholder="Servidor, URL ou endpoint de acesso"
                  className="mt-1 block w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium">
                  Aplicação
                  <input
                    maxLength={150}
                    value={applicationName}
                    onChange={(event) => setApplicationName(event.target.value)}
                    placeholder="WinThor"
                    className="mt-1 block w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Usuário
                  <input
                    maxLength={255}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Metadata do usuário"
                    className="mt-1 block w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium">
                Secret reference
                <input
                  maxLength={500}
                  value={secretReference}
                  onChange={(event) => setSecretReference(event.target.value)}
                  placeholder="windows-credential-manager://..."
                  className="mt-1 block w-full rounded-md border border-[var(--border)] px-3 py-2 font-mono text-sm outline-none focus:border-[var(--accent)]"
                />
                <span className="mt-1 block text-xs font-normal text-[var(--muted)]">
                  Esta referência deve apontar para um segredo armazenado fora do
                  frontend. Não informe o valor secreto.
                </span>
              </label>

              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => setEnabled(event.target.checked)}
                  className="h-4 w-4"
                />
                Perfil ativo
              </label>

              {mutation.isError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {mutation.error.message}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={mutation.isPending}
                  className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)] disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {mutation.isPending
                    ? 'Salvando...'
                    : profile
                      ? 'Salvar alterações'
                      : 'Criar perfil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
