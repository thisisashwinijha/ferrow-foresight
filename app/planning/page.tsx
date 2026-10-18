import { getPmPlans } from '@/lib/data/pmPlan';
import { getAllMachines } from '@/lib/data/machines';
import { getPlants, getPlantById } from '@/lib/data/plants';
import { getLines } from '@/lib/data/lines';
import { getAlerts } from '@/lib/data/alerts';
import { pmOptimiserService } from '@/lib/pmOptimiserService';
import { MaintenancePlanningView } from '@/components/MaintenancePlanningView';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MaintenancePlanningPage({
  searchParams,
}: {
  searchParams?: { plant?: string; line?: string };
}) {
  noStore();
  const activePlantId = searchParams?.plant || 'P-07';
  const activeLineId = searchParams?.line;

  const [pmPlans, machines, plant, lines, alerts, optimiserResult] = await Promise.all([
    getPmPlans(activePlantId, activeLineId),
    getAllMachines(activePlantId),
    getPlantById(activePlantId),
    getLines(activePlantId),
    getAlerts(activePlantId, activeLineId),
    pmOptimiserService(activePlantId).catch(() => null),
  ]);

  return (
    <MaintenancePlanningView
      initialPmPlans={pmPlans}
      machines={machines}
      plant={plant}
      lines={lines}
      alerts={alerts}
      initialOptimiserResult={optimiserResult}
    />
  );
}
