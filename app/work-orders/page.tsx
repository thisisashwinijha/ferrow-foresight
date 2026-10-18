import { getWorkOrders } from '@/lib/data/workOrders';
import { getAllMachines } from '@/lib/data/machines';
import { getPlants, getPlantById } from '@/lib/data/plants';
import { getLines } from '@/lib/data/lines';
import { getTechnicians } from '@/lib/data/technicians';
import { WorkOrdersKanbanView } from '@/components/WorkOrdersKanbanView';

export const dynamic = 'force-dynamic';

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams?: { plant?: string; line?: string };
}) {
  const activePlantId = searchParams?.plant || 'P-07';
  const activeLineId = searchParams?.line;

  const [workOrders, machines, plant, lines, technicians] = await Promise.all([
    getWorkOrders(activePlantId, activeLineId),
    getAllMachines(activePlantId),
    getPlantById(activePlantId),
    getLines(activePlantId),
    getTechnicians(activePlantId),
  ]);

  return (
    <WorkOrdersKanbanView
      initialWorkOrders={workOrders}
      machines={machines}
      plant={plant}
      lines={lines}
      technicians={technicians}
    />
  );
}
