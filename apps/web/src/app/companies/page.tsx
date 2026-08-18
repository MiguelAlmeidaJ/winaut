import { PageHeader } from '@/components/ui/page-header';
import { CompaniesTable } from '@/features/companies/companies-table';

export default function CompaniesPage() {
  return (
    <>
      <PageHeader
        title="Empresas"
        description="Empresas clientes e quantidade de ambientes WinThor associados."
      />
      <CompaniesTable />
    </>
  );
}
