'use client';

import type {
  WinThorAccessProfileItem,
  WinThorExecutionMode,
} from '@winaut/contracts';

import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';

import { formatExecutionMode } from '../formatters';
import { AccessProfileDialog } from './access-profile-dialog';
import { DetailSection } from './detail-section';

function valueOrDash(value: string | null): string {
  return value?.trim() ? value : '—';
}

interface AccessProfilesSectionProps {
  winthorInstanceId: string;
  defaultType: WinThorExecutionMode;
  profiles: WinThorAccessProfileItem[];
}

export function AccessProfilesSection({
  winthorInstanceId,
  defaultType,
  profiles,
}: AccessProfilesSectionProps) {
  return (
    <DetailSection
      title="Perfis de acesso"
      description="Somente metadados seguros de conexão. Nenhum segredo em plaintext é exibido."
      action={
        <AccessProfileDialog
          winthorInstanceId={winthorInstanceId}
          defaultType={defaultType}
        />
      }
    >
      {profiles.length === 0 ? (
        <div className="p-5">
          <EmptyState
            title="Nenhum perfil de acesso cadastrado"
            description="Este ambiente ainda não possui metadata de acesso configurada."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--border)] text-sm">
            <thead className="bg-[var(--surface-muted)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Endpoint</th>
                <th className="px-5 py-3">Aplicação</th>
                <th className="px-5 py-3">Usuário</th>
                <th className="px-5 py-3">Secret reference</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {profiles.map((profile) => (
                <tr key={profile.id}>
                  <td className="px-5 py-4 font-medium">
                    {formatExecutionMode(profile.type)}
                  </td>
                  <td className="max-w-xs break-all px-5 py-4 text-[var(--muted)]">
                    {valueOrDash(profile.endpoint)}
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">
                    {valueOrDash(profile.applicationName)}
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">
                    {valueOrDash(profile.username)}
                  </td>
                  <td className="max-w-xs break-all px-5 py-4 font-mono text-xs text-[var(--muted)]">
                    {valueOrDash(profile.secretReference)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge active={profile.enabled} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <AccessProfileDialog
                      winthorInstanceId={winthorInstanceId}
                      defaultType={defaultType}
                      profile={profile}
                      triggerLabel="Editar"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DetailSection>
  );
}
