interface AgentStatusBadgeProps {
  enabled: boolean;
  online: boolean;
}

export function AgentStatusBadge({
  enabled,
  online,
}: AgentStatusBadgeProps) {
  const state = !enabled
    ? {
        label: 'Desabilitado',
        className:
          'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
      }
    : online
      ? {
          label: 'Online',
          className:
            'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
        }
      : {
          label: 'Offline',
          className:
            'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
        };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${state.className}`}
    >
      {state.label}
    </span>
  );
}
