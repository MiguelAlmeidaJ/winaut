import { PageHeader } from '@/components/ui/page-header';
import { CreateWinThorInstanceDialog } from '@/features/winthor-instances/create-winthor-instance-dialog';
import { WinThorInstancesTable } from '@/features/winthor-instances/winthor-instances-table';

export default function WinThorInstancesPage() {
  return (
    <>
      <PageHeader
        title="Ambientes WinThor"
        description="Ambientes lógicos WinThor por empresa, modo de execução e disponibilidade dos Agents."
        action={<CreateWinThorInstanceDialog />}
      />
      <WinThorInstancesTable />
    </>
  );
}
