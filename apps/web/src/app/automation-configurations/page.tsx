import { PageHeader } from '@/components/ui/page-header';
import { AutomationConfigurationsView } from '@/features/automation-configurations/automation-configurations-view';

export default function AutomationConfigurationsPage() {
  return (
    <>
      <PageHeader
        title="Configurações"
        description="Cadastre filiais e defina como cada ambiente deve gerar as etapas das automações."
      />
      <AutomationConfigurationsView />
    </>
  );
}
