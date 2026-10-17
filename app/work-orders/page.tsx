import { ComingSoonPage } from '@/components/ComingSoonPage';

export default function WorkOrdersKanbanPage() {
  return (
    <ComingSoonPage
      module="Execution & Work Orders"
      route="/work-orders"
      description="Kanban by status: raised, approved, scheduled, loto_applied, in_progress, closed"
    />
  );
}
