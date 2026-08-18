import { PageHeader } from '@/components/ui/page-header';
import { WinThorInstancesTable } from '@/features/winthor-instances/winthor-instances-table';

export default function WinThorInstancesPage() {
  return (
    <>
      <PageHeader
        title="Ambientes WinThor"
        description="Ambientes lógicos WinThor por empresa, modo de execução e disponibilidade dos Agents."
      />
      <WinThorInstancesTable />
    </>
  );
}
