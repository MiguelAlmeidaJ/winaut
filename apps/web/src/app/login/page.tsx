'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { authKeys } from '@/features/auth/queries';

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.login({
        email: email.trim(),
        password,
      }),
    onSuccess: (session) => {
      queryClient.setQueryData(authKeys.me, session.user);
      router.replace('/');
      router.refresh();
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      return;
    }

    mutation.mutate();
  }

  return (
    <main className="min-h-screen bg-[var(--background)] lg:grid lg:grid-cols-[minmax(320px,0.85fr)_minmax(480px,1.15fr)]">
      <section className="hidden bg-[var(--sidebar)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-sm font-bold text-[var(--sidebar)]">
            WA
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">WinAut</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-[var(--sidebar-muted)]">
            Operação, configuração e observabilidade das automações WinThor em
            um único painel.
          </p>
        </div>

        <div className="max-w-md border-t border-white/10 pt-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">
            Acesso administrativo
          </p>
          <p className="mt-2 text-sm text-[var(--sidebar-muted)]">
            As rotas administrativas são validadas pela API. Agents Windows
            continuam usando credenciais próprias e isoladas.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--sidebar)] text-xs font-bold text-white">
              WA
            </div>
            <p className="mt-3 text-lg font-semibold">WinAut</p>
          </div>

          <p className="text-sm font-medium text-[var(--accent)]">
            Painel administrativo
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Entre na sua conta
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Use o administrador configurado na API para continuar.
          </p>

          <form
            onSubmit={submit}
            className="mt-8 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm"
          >
            <label className="block text-sm font-medium">
              E-mail
              <input
                type="email"
                autoComplete="username"
                required
                maxLength={255}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@empresa.com.br"
                className="mt-2 block w-full rounded-lg border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="mt-5 block text-sm font-medium">
              Senha
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 block w-full rounded-lg border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-blue-100"
              />
            </label>

            {mutation.isError ? (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {mutation.error.message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="mt-6 w-full rounded-lg bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation.isPending ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-[var(--muted)]">
            Sessão protegida por cookie HttpOnly.
          </p>
        </div>
      </section>
    </main>
  );
}
