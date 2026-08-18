'use client';

import { useState } from 'react';

interface OneTimeTokenDialogProps {
  token: string;
  warning: string;
  title: string;
  onClose: () => void;
}

export function OneTimeTokenDialog({
  token,
  warning,
  title,
  onClose,
}: OneTimeTokenDialogProps) {
  const [copyStatus, setCopyStatus] =
    useState<'idle' | 'copied' | 'error'>('idle');

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(token);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-token-title"
        className="w-full max-w-2xl rounded-xl border border-[var(--border)] bg-white p-6 shadow-xl"
      >
        <h2 id="agent-token-title" className="text-lg font-semibold">
          {title}
        </h2>
        <p className="mt-2 text-sm text-amber-800">
          {warning}
        </p>

        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
            Token do Agent
          </p>
          <code className="mt-2 block break-all text-sm text-amber-950">
            {token}
          </code>
        </div>

        <p className="mt-4 text-sm text-[var(--muted)]">
          Depois de fechar esta janela, o WinAut não poderá recuperar este token.
          Gere uma nova credencial se ele for perdido.
        </p>

        {copyStatus === 'error' ? (
          <p className="mt-3 text-sm text-red-700">
            Não foi possível copiar automaticamente. Selecione o token acima e
            copie manualmente.
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
          >
            Já armazenei, fechar
          </button>
          <button
            type="button"
            onClick={() => void copyToken()}
            className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {copyStatus === 'copied' ? 'Copiado' : 'Copiar token'}
          </button>
        </div>
      </div>
    </div>
  );
}
