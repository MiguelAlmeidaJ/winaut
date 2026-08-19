import { PageHeader } from '@/components/ui/page-header';
import { CreateCompanyScheduleDialog } from '@/features/schedules/create-company-schedule-dialog';
import { SchedulesTable } from '@/features/schedules/schedules-table';

export default function SchedulesPage() {
  return (
    <>
      <PageHeader
        title="Agendamentos"
        description="Configure quando cada rotina WinThor deve ser executada e acompanhe os próximos horários."
        action={<CreateCompanyScheduleDialog />}
      />
      <SchedulesTable />
    </>
  );
}
