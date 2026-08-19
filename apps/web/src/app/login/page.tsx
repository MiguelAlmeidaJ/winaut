'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';

import { OrquestraBrand } from '@/components/brand/orquestra-brand';
import { authKeys } from '@/features/auth/queries';
import { apiClient } from '@/lib/api/client';

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
    <main className="min-h-screen bg-[var(--background)] lg:grid lg:grid-cols-[minmax(360px,0.9fr)_minmax(480px,1.1fr)]">
      <section className="relative hidden overflow-hidden bg-[var(--sidebar)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute -right-28 -top-24 h-80 w-80 rounded-full bg-[var(--accent)]/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-24 h-72 w-72 rounded-full bg-[var(--accent-sky)]/12 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative">
          <OrquestraBrand
            variant="white"
            className="h-auto w-[290px] max-w-full"
            priority
          />
          <p className="mt-8 max-w-md text-sm leading-7 text-white/72">
            Centralize operação, configuração e observabilidade das automações
            WinThor em uma experiência única.
          </p>
        </div>

        <div className="relative max-w-md border-t border-white/12 pt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
            Acesso administrativo
          </p>
          <p className="mt-2 text-sm leading-6 text-white/72">
            As rotas administrativas são validadas pela API. Agents Windows
            continuam usando credenciais próprias e isoladas.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-9 lg:hidden">
            <OrquestraBrand
              variant="color"
              className="h-auto w-[220px] max-w-full"
              priority
            />
          </div>

          <p className="text-sm font-semibold text-[var(--accent)]">
            Painel administrativo
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Entre na sua conta
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)] opacity-70">
            Use o administrador configurado na API para continuar.
          </p>

          <form
            onSubmit={submit}
            className="mt-8 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[0_18px_50px_rgb(2_27_50/8%)]"
          >
            <label className="block text-sm font-semibold">
              E-mail
              <input
                type="email"
                autoComplete="username"
                required
                maxLength={255}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@empresa.com.br"
                className="mt-2 block w-full rounded-lg border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgb(39_60_228/12%)]"
              />
            </label>

            <label className="mt-5 block text-sm font-semibold">
              Senha
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 block w-full rounded-lg border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgb(39_60_228/12%)]"
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
              className="mt-6 w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation.isPending ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-[var(--muted)] opacity-65">
            Sessão protegida por cookie HttpOnly.
          </p>
        </div>
      </section>
    </main>
  );
}
