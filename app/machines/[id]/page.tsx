import { ComingSoonPage } from '@/components/ComingSoonPage';

export default function MachineHistoryCardPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <ComingSoonPage
      module={`Machine History Card: ${params.id}`}
      route={`/machines/${params.id}`}
      description="Asset details, strategy, health and risk, live telemetry chart (sensor machines), observations, maintenance log timeline, MTBF/MTTR, related alerts and work orders, AI summary"
    />
  );
}
