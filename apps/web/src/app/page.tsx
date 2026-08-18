import { PageHeader } from '@/components/ui/page-header';
import { DashboardOverview } from '@/features/dashboard/dashboard-overview';

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão operacional dos ambientes e automações do WinAut."
      />
      <DashboardOverview />
    </>
  );
}
