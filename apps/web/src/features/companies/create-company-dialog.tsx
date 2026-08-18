'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useState } from 'react';

import { apiClient } from '@/lib/api/client';

import { companyKeys } from './queries';

export function CreateCompanyDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [active, setActive] = useState(true);

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.createCompany({
        name: name.trim(),
        ...(document.trim() ? { document: document.trim() } : {}),
        active,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: companyKeys.all });
      close();
    },
  });

  function close() {
    setOpen(false);
    setName('');
    setDocument('');
    setActive(true);
    mutation.reset();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    mutation.mutate();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Nova empresa
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-company-title"
            className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-white p-6 shadow-xl"
          >
            <h2 id="create-company-title" className="text-lg font-semibold">
              Nova empresa
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Cadastre a empresa cliente que será proprietária dos ambientes WinThor.
            </p>

            <form className="mt-6 space-y-4" onSubmit={submit}>
              <label className="block text-sm font-medium">
                Nome
                <input
                  required
                  maxLength={150}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Distribuidora ABC"
                  className="mt-1 block w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>

              <label className="block text-sm font-medium">
                Documento
                <input
                  maxLength={30}
                  value={document}
                  onChange={(event) => setDocument(event.target.value)}
                  placeholder="CNPJ ou identificador"
                  className="mt-1 block w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>

              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => setActive(event.target.checked)}
                  className="h-4 w-4"
                />
                Empresa ativa
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
                  className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {mutation.isPending ? 'Salvando...' : 'Cadastrar empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
