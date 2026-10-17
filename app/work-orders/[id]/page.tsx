import { ComingSoonPage } from '@/components/ComingSoonPage';

export default function WorkOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <ComingSoonPage
      module={`Work Order Detail: ${params.id}`}
      route={`/work-orders/${params.id}`}
      description="LOTO checklist (must complete before task steps unlock), task checklist, technician + shadow, spares, closure form (root cause, notes, downtime)"
    />
  );
}
