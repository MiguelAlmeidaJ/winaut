import { PageHeader } from '@/components/ui/page-header';
import { RunsView } from '@/features/runs/runs-view';

export default function RunsPage() {
  return (
    <>
      <PageHeader
        title="Execuções"
        description="Acompanhe execuções agendadas e manuais, seus estados e tempos de processamento."
      />
      <RunsView />
    </>
  );
}
