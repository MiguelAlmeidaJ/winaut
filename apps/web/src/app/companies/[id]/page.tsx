import { CompanyDetailView } from '@/features/companies/company-detail-view';

interface CompanyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({
  params,
}: CompanyDetailPageProps) {
  const { id } = await params;

  return <CompanyDetailView companyId={id} />;
}
