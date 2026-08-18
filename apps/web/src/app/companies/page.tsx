import { PageHeader } from '@/components/ui/page-header';
import { CompaniesTable } from '@/features/companies/companies-table';
import { CreateCompanyDialog } from '@/features/companies/create-company-dialog';

export default function CompaniesPage() {
  return (
    <>
      <PageHeader
        title="Empresas"
        description="Empresas clientes e quantidade de ambientes WinThor associados."
        action={<CreateCompanyDialog />}
      />
      <CompaniesTable />
    </>
  );
}
