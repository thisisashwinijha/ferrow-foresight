import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { ControlRoomView } from '@/components/ControlRoomView';
import { getPlantById } from '@/lib/data/plants';
import { getLines } from '@/lib/data/lines';
import { getAllMachines } from '@/lib/data/machines';
import { getAlerts } from '@/lib/data/alerts';
import { getWorkOrders } from '@/lib/data/workOrders';
import { getLatestKpiSnapshot, getPreviousKpiSnapshot } from '@/lib/data/kpis';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ControlRoomPage({
  searchParams,
}: {
  searchParams?: Promise<{ plant?: string; line?: string }> | { plant?: string; line?: string };
}) {
  noStore();
  const resolvedParams = searchParams ? await searchParams : {};
  if (resolvedParams?.plant === 'all') {
    redirect('/network');
  }

  const plantId = resolvedParams?.plant || 'P-07';
  const lineId = resolvedParams?.line;

  const [plant, lines, machines, alerts, workOrders, currentKpi, previousKpi] = await Promise.all([
    getPlantById(plantId),
    getLines(plantId),
    getAllMachines(plantId),
    getAlerts(plantId, lineId),
    getWorkOrders(plantId, lineId),
    getLatestKpiSnapshot(plantId),
    getPreviousKpiSnapshot(plantId),
  ]);

  return (
    <ControlRoomView
      initialPlant={plant}
      initialLines={lines}
      initialMachines={machines}
      initialAlerts={alerts}
      initialWorkOrders={workOrders}
      initialCurrentKpi={currentKpi}
      initialPreviousKpi={previousKpi}
    />
  );
}
