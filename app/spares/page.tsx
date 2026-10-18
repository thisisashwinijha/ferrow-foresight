import { getSpares } from '@/lib/data/spares';
import { getWorkOrders } from '@/lib/data/workOrders';
import { getAllMachines } from '@/lib/data/machines';
import { getPlantById } from '@/lib/data/plants';
import { SparesReadinessView } from '@/components/SparesReadinessView';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SparesPage({
  searchParams,
}: {
  searchParams?: { plant?: string; line?: string };
}) {
  noStore();
  const activePlantId = searchParams?.plant || 'P-07';
  const activeLineId = searchParams?.line;

  const [spares, workOrders, machines, plant] = await Promise.all([
    getSpares(activePlantId, activeLineId),
    getWorkOrders(activePlantId, activeLineId),
    getAllMachines(activePlantId),
    getPlantById(activePlantId),
  ]);

  return (
    <SparesReadinessView
      initialSpares={spares}
      workOrders={workOrders}
      machines={machines}
      plant={plant}
    />
  );
}
