'use client';

import type {
  CreateWinThorBranchInput,
  WinThorBranchItem,
} from '@winaut/contracts';
import type { FormEvent } from 'react';
import { useState } from 'react';

interface BranchDialogProps {
  open: boolean;
  winthorInstanceId: string;
  branch?: WinThorBranchItem | null;
  pending: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (input: CreateWinThorBranchInput) => void;
}

export function BranchDialog({
  open,
  winthorInstanceId,
  branch,
  pending,
  error,
  onClose,
  onSubmit,
}: BranchDialogProps) {
  const [code, setCode] = useState(branch?.code ?? '');
  const [name, setName] = useState(branch?.name ?? '');

  if (!open) {
    return null;
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!code.trim() || !name.trim()) {
      return;
    }

    onSubmit({
      winthorInstanceId,
      code: code.trim(),
      name: name.trim(),
      active: branch?.active ?? true,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-6 shadow-xl"
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
            Ambiente WinThor
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            {branch ? 'Editar filial' : 'Nova filial'}
          </h2>
        </div>

        <label className="mt-6 block text-sm font-medium">
          Código
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            maxLength={30}
            required
            placeholder="3"
            className="mt-2 block w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
          <span className="mt-1 block text-xs font-normal text-[var(--muted)]">
            Use o mesmo código de filial utilizado no WinThor.
          </span>
        </label>

        <label className="mt-5 block text-sm font-medium">
          Nome
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={150}
            required
            placeholder="Loja Norte"
            className="mt-2 block w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>

        {error ? (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Salvando...' : 'Salvar filial'}
          </button>
        </div>
      </form>
    </div>
  );
}
