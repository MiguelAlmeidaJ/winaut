import type { AgentListItem } from '@winaut/contracts';

interface AgentOnboardingSectionProps {
  agent: AgentListItem;
}

function operationalMessage(agent: AgentListItem): string {
  if (!agent.enabled) {
    return 'Agent desabilitado. Reabilite-o antes de iniciar ou reiniciar o processo no Windows.';
  }

  if (agent.online) {
    return 'Agent conectado. O backend recebeu um heartbeat recente desta instalação.';
  }

  if (!agent.lastSeenAt) {
    return 'Aguardando o primeiro heartbeat. Configure o Windows Agent com a URL da API e uma credencial válida.';
  }

  return 'Agent habilitado, porém sem heartbeat recente. Verifique se o processo está em execução e alcança a API.';
}

export function AgentOnboardingSection({
  agent,
}: AgentOnboardingSectionProps) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-white p-5">
      <h2 className="text-base font-semibold">Onboarding do Windows Agent</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Parâmetros usados pelo Agent atual. O token não é recuperável por esta tela.
      </p>

      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm">
        {operationalMessage(agent)}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
        <pre>{`WINAUT_API_URL=<URL da API acessível pelo Windows>
WINAUT_AGENT_TOKEN=<token exibido na criação ou em uma nova credencial>
WINAUT_AGENT_VERSION=<versão instalada>
WINAUT_AGENT_HEARTBEAT_INTERVAL_MS=30000
WINAUT_AGENT_REQUEST_TIMEOUT_MS=10000
WINAUT_AGENT_JOB_LOOP_ENABLED=false`}</pre>
      </div>

      <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
        <p>
          O hostname e a versão podem ser atualizados pelo próprio heartbeat do
          Agent. O painel usa o campo <code>online</code> calculado pelo backend;
          não existe cálculo paralelo de timeout no navegador.
        </p>
        <p>
          Se a credencial original foi perdida, gere uma nova na seção abaixo e
          atualize <code>WINAUT_AGENT_TOKEN</code> no Windows.
        </p>
      </div>
    </section>
  );
}
