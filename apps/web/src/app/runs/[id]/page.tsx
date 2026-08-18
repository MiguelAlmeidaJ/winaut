import { RunDetailView } from '@/features/runs/run-detail-view';

interface RunDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RunDetailPage({ params }: RunDetailPageProps) {
  const { id } = await params;

  return <RunDetailView runId={id} />;
}
