import { getProductionSchedule } from '@/lib/data/production';
import { getLines } from '@/lib/data/lines';
import { getWorkOrders } from '@/lib/data/workOrders';
import { getAllMachines } from '@/lib/data/machines';
import { getPlants, getPlantById } from '@/lib/data/plants';
import { ProductionCoordinationView } from '@/components/ProductionCoordinationView';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProductionPage({
  searchParams,
}: {
  searchParams?: { plant?: string; line?: string };
}) {
  noStore();
  const activePlantId = searchParams?.plant || 'P-07';
  const activeLineId = searchParams?.line;

  const [productionSchedule, lines, workOrders, machines, plant] = await Promise.all([
    getProductionSchedule(activePlantId, activeLineId),
    getLines(activePlantId),
    getWorkOrders(activePlantId, activeLineId),
    getAllMachines(activePlantId),
    getPlantById(activePlantId),
  ]);

  return (
    <ProductionCoordinationView
      initialSchedule={productionSchedule}
      lines={lines}
      workOrders={workOrders}
      machines={machines}
      plant={plant}
    />
  );
}
