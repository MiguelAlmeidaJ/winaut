import { PageHeader } from '@/components/ui/page-header';
import { AgentsTable } from '@/features/agents/agents-table';
import { CreateAgentDialog } from '@/features/agents/components/create-agent-dialog';

export default function AgentsPage() {
  return (
    <>
      <PageHeader
        title="Agents"
        description="Agents Windows responsáveis por executar as automações em cada ambiente WinThor."
        action={<CreateAgentDialog />}
      />
      <AgentsTable />
    </>
  );
}
