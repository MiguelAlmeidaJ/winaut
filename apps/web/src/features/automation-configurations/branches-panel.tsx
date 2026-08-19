'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateWinThorBranchInput,
  WinThorBranchItem,
} from '@winaut/contracts';
import { useState } from 'react';

import { apiClient } from '@/lib/api/client';

import { BranchDialog } from './branch-dialog';
import {
  automationConfigurationKeys,
  branchesQueryOptions,
} from './queries';

interface BranchesPanelProps {
  winthorInstanceId: string;
}

export function BranchesPanel({
  winthorInstanceId,
}: BranchesPanelProps) {
  const queryClient = useQueryClient();
  const branchesQuery = useQuery(branchesQueryOptions(winthorInstanceId));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WinThorBranchItem | null>(null);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey:
          automationConfigurationKeys.branches(winthorInstanceId),
      }),
      queryClient.invalidateQueries({
        queryKey:
          automationConfigurationKeys.routine507(winthorInstanceId),
      }),
    ]);
  }

  const saveMutation = useMutation({
    mutationFn: (input: CreateWinThorBranchInput) =>
      editing
        ? apiClient.updateWinThorBranch(editing.id, {
            code: input.code,
            name: input.name,
          })
        : apiClient.createWinThorBranch(input),
    onSuccess: async () => {
      setDialogOpen(false);
      setEditing(null);
      await refresh();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (branch: WinThorBranchItem) =>
      apiClient.updateWinThorBranch(branch.id, {
        active: !branch.active,
      }),
    onSuccess: refresh,
  });

  const branches = branchesQuery.data ?? [];

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
        <div>
          <h2 className="font-semibold">Filiais</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Códigos usados para expandir as etapas da rotina 507.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            saveMutation.reset();
            setDialogOpen(true);
          }}
          className="shrink-0 rounded-lg bg-[var(--foreground)] px-3 py-2 text-xs font-medium text-white hover:opacity-90"
        >
          Nova filial
        </button>
      </div>

      {branchesQuery.isPending ? (
        <div className="p-5 text-sm text-[var(--muted)]">
          Carregando filiais...
        </div>
      ) : branchesQuery.isError ? (
        <div className="p-5 text-sm text-red-700">
          {branchesQuery.error.message}
        </div>
      ) : branches.length === 0 ? (
        <div className="p-5">
          <p className="text-sm font-medium">Nenhuma filial cadastrada</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Cadastre pelo menos uma filial antes de executar a rotina 507.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-[var(--surface-muted)] px-2 py-1 font-mono text-xs font-semibold">
                    {branch.code}
                  </span>
                  <p className="truncate text-sm font-medium">
                    {branch.name}
                  </p>
                </div>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {branch.active
                    ? 'Ativa e disponível para automações'
                    : 'Desativada'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(branch);
                    saveMutation.reset();
                    setDialogOpen(true);
                  }}
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium hover:bg-[var(--surface-muted)]"
                >
                  Editar
                </button>
                <button
                  type="button"
                  disabled={toggleMutation.isPending}
                  onClick={() => toggleMutation.mutate(branch)}
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium hover:bg-[var(--surface-muted)] disabled:opacity-50"
                >
                  {branch.active ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toggleMutation.isError ? (
        <div className="border-t border-[var(--border)] bg-red-50 px-5 py-3 text-sm text-red-700">
          {toggleMutation.error.message}
        </div>
      ) : null}

      {dialogOpen ? (
        <BranchDialog
          open
          winthorInstanceId={winthorInstanceId}
          branch={editing}
          pending={saveMutation.isPending}
          error={
            saveMutation.isError ? saveMutation.error.message : undefined
          }
          onClose={() => {
            if (!saveMutation.isPending) {
              setDialogOpen(false);
              setEditing(null);
            }
          }}
          onSubmit={(input) => saveMutation.mutate(input)}
        />
      ) : null}
    </section>
  );
}
