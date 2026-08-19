'use client';

import type { CreateAgentEnrollmentResponse } from '@winaut/contracts';
import { useState } from 'react';

interface AgentActivationDialogProps {
  enrollment: CreateAgentEnrollmentResponse;
  onClose(): void;
}

function configuredApiUrl(): string {
  return (
    process.env.NEXT_PUBLIC_WINAUT_API_URL?.replace(/\/+$/, '') ||
    '<URL da API Orquestra>'
  );
}

export function AgentActivationDialog({
  enrollment,
  onClose,
}: AgentActivationDialogProps) {
  const [copied, setCopied] = useState<'code' | 'command' | null>(null);
  const apiUrl = configuredApiUrl();
  const activationCode = enrollment.activation.code;
  const command = `pnpm --filter @winaut/agent enroll -- ${apiUrl} ${activationCode}`;

  async function copy(value: string, target: 'code' | 'command') {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(target);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-activation-title"
        className="w-full max-w-2xl rounded-xl border border-[var(--border)] bg-white p-6 shadow-xl"
      >
        <h2 id="agent-activation-title" className="text-lg font-semibold">
          Ativar {enrollment.agent.name}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Use este código uma única vez na máquina Windows que executará o Agent.
        </p>

        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {enrollment.activation.warning}
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              URL da API
            </p>
            <div className="mt-1 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 font-mono text-sm">
              {apiUrl}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Código de ativação
              </p>
              <button
                type="button"
                onClick={() => void copy(activationCode, 'code')}
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                {copied === 'code' ? 'Copiado' : 'Copiar código'}
              </button>
            </div>
            <div className="mt-1 break-all rounded-lg bg-slate-950 px-4 py-4 font-mono text-base font-semibold tracking-wide text-white">
              {activationCode}
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Expira em {new Date(enrollment.activation.expiresAt).toLocaleString('pt-BR')}.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Comando de desenvolvimento
              </p>
              <button
                type="button"
                onClick={() => void copy(command, 'command')}
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                {copied === 'command' ? 'Copiado' : 'Copiar comando'}
              </button>
            </div>
            <div className="mt-1 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
              <pre>{command}</pre>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Este comando será substituído pelo Orquestra Agent Setup no próximo passo.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
