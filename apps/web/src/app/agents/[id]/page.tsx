import { AgentDetailView } from '@/features/agents/agent-detail-view';

interface AgentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { id } = await params;

  return <AgentDetailView agentId={id} />;
}
