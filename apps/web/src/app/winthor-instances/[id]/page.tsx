import { WinThorInstanceDetailView } from '@/features/winthor-instances/winthor-instance-detail-view';

interface WinThorInstanceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function WinThorInstanceDetailPage({
  params,
}: WinThorInstanceDetailPageProps) {
  const { id } = await params;

  return <WinThorInstanceDetailView instanceId={id} />;
}
