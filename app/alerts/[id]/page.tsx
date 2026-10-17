import { ComingSoonPage } from '@/components/ComingSoonPage';

export default function AlertDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <ComingSoonPage
      module={`Alert Detail: ${params.id}`}
      route={`/alerts/${params.id}`}
      description="Evidence list, reasoning, recommended action, guardrail checks, technician, window, spares, cost of failure vs intervention, Approve / Reject with reason"
    />
  );
}
