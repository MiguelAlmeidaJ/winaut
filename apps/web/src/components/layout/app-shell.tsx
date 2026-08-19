'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { WinAutApiError } from '@winaut/api-client';
import type { AdminUser } from '@winaut/contracts';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { authKeys, currentAdminQueryOptions } from '@/features/auth/queries';
import { apiClient } from '@/lib/api/client';

import { MobileNav } from './mobile-nav';
import { Sidebar } from './sidebar';

const routeNames = [
  { prefix: '/companies', label: 'Empresas' },
  { prefix: '/winthor-instances', label: 'Ambientes WinThor' },
  { prefix: '/agents', label: 'Agents' },
  { prefix: '/automation-configurations', label: 'Configurações' },
  { prefix: '/schedules', label: 'Agendamentos' },
  { prefix: '/runs', label: 'Execuções' },
] as const;

function routeLabel(pathname: string): string {
  if (pathname === '/') {
    return 'Dashboard';
  }

  return (
    routeNames.find((item) => pathname.startsWith(item.prefix))?.label ??
    'Orquestra'
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/login') {
    return children;
  }

  return (
    <AuthenticatedShell pathname={pathname}>
      {children}
    </AuthenticatedShell>
  );
}

function AuthenticatedShell({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  const router = useRouter();
  const authQuery = useQuery(currentAdminQueryOptions);

  useEffect(() => {
    if (
      authQuery.error instanceof WinAutApiError &&
      authQuery.error.status === 401
    ) {
      router.replace('/login');
    }
  }, [authQuery.error, router]);

  if (authQuery.isPending) {
    return <SessionSkeleton />;
  }

  if (authQuery.isError) {
    if (
      authQuery.error instanceof WinAutApiError &&
      authQuery.error.status === 401
    ) {
      return <SessionSkeleton />;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6">
        <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-white p-6 text-center">
          <h1 className="font-semibold">Não foi possível validar sua sessão</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {authQuery.error.message}
          </p>
          <button
            type="button"
            onClick={() => void authQuery.refetch()}
            className="mt-5 rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] lg:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[var(--border)] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
              Painel operacional
            </p>
            <p className="mt-1 truncate text-sm font-semibold">
              {routeLabel(pathname)}
            </p>
          </div>
          <UserMenu user={authQuery.data} />
        </header>
        <MobileNav />
        <main className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function UserMenu({ user }: { user: AdminUser }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: () => apiClient.logout(),
    onSettled: async () => {
      queryClient.removeQueries({ queryKey: authKeys.me });
      router.replace('/login');
      router.refresh();
    },
  });

  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium">{user.name}</p>
        <p className="text-xs text-[var(--muted)]">Administrador</p>
      </div>
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-muted)] text-xs font-semibold"
        title={user.email}
      >
        {initials || 'AD'}
      </div>
      <button
        type="button"
        disabled={logoutMutation.isPending}
        onClick={() => logoutMutation.mutate()}
        className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] disabled:opacity-50"
      >
        {logoutMutation.isPending ? 'Saindo...' : 'Sair'}
      </button>
    </div>
  );
}

function SessionSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--background)] lg:flex">
      <div className="hidden w-[288px] bg-[var(--sidebar)] lg:block" />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
          Validando sessão...
        </div>
      </div>
    </div>
  );
}
