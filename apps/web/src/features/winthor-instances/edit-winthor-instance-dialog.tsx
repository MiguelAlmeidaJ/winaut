'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  WinThorExecutionMode,
  WinThorHostingType,
  WinThorInstanceDetail,
} from '@winaut/contracts';
import type { FormEvent } from 'react';
import { useState } from 'react';

import { companyKeys } from '@/features/companies/queries';
import { apiClient } from '@/lib/api/client';

import { executionModeOptions, hostingTypeOptions } from './options';
import { winThorInstanceKeys } from './queries';

interface EditWinThorInstanceDialogProps {
  instance: WinThorInstanceDetail;
}

export function EditWinThorInstanceDialog({
  instance,
}: EditWinThorInstanceDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(instance.name);
  const [active, setActive] = useState(instance.active);
  const [timeZone, setTimeZone] = useState(instance.timeZone);
  const [hostingType, setHostingType] =
    useState<WinThorHostingType>(instance.hostingType);
  const [executionMode, setExecutionMode] =
    useState<WinThorExecutionMode>(instance.executionMode);

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.updateWinThorInstance(instance.id, {
        name: name.trim(),
        active,
        timeZone: timeZone.trim(),
        hostingType,
        executionMode,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: winThorInstanceKeys.all }),
        queryClient.invalidateQueries({
          queryKey: winThorInstanceKeys.detail(instance.id),
        }),
        queryClient.invalidateQueries({
          queryKey: companyKeys.detail(instance.company.id),
        }),
      ]);
      setOpen(false);
    },
  });

  function openDialog() {
    setName(instance.name);
    setActive(instance.active);
    setTimeZone(instance.timeZone);
    setHostingType(instance.hostingType);
    setExecutionMode(instance.executionMode);
    mutation.reset();
    setOpen(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !timeZone.trim()) return;
    mutation.mutate();
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
      >
        Editar ambiente
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-winthor-instance-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--border)] bg-white p-6 shadow-xl"
          >
            <h2 id="edit-winthor-instance-title" className="text-lg font-semibold">
              Editar ambiente WinThor
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              A empresa proprietária não pode ser alterada por este endpoint.
            </p>

            <form className="mt-6 space-y-4" onSubmit={submit}>
              <label className="block text-sm font-medium">
                Nome do ambiente
                <input
                  required
                  maxLength={150}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 block w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium">
                  Hospedagem
                  <select
                    value={hostingType}
                    onChange={(event) =>
                      setHostingType(event.target.value as WinThorHostingType)
                    }
                    className="mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  >
                    {hostingTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium">
                  Modo de execução
                  <select
                    value={executionMode}
                    onChange={(event) =>
                      setExecutionMode(event.target.value as WinThorExecutionMode)
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
              </div>

              <label className="block text-sm font-medium">
                Timezone IANA
                <input
                  required
                  maxLength={100}
                  value={timeZone}
                  onChange={(event) => setTimeZone(event.target.value)}
                  className="mt-1 block w-full rounded-md border border-[var(--border)] px-3 py-2 font-mono text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>

              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => setActive(event.target.checked)}
                  className="h-4 w-4"
                />
                Ambiente ativo
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
                  {mutation.isPending ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
