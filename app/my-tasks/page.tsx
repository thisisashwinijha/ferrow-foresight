import { unstable_noStore as noStore } from 'next/cache';
import { MyTasksView } from '@/components/MyTasksView';
import { getPlantById } from '@/lib/data/plants';
import { getAllMachines } from '@/lib/data/machines';
import { getAlerts } from '@/lib/data/alerts';
import { getWorkOrders } from '@/lib/data/workOrders';
import { getSpares } from '@/lib/data/spares';
import { getTechnicians } from '@/lib/data/technicians';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MyTasksPage({
  searchParams,
}: {
  searchParams?: Promise<{ plant?: string; line?: string }> | { plant?: string; line?: string };
}) {
  noStore();
  const resolvedParams = searchParams ? await searchParams : {};
  const plantId = resolvedParams?.plant || 'P-07';

  const [plant, machines, alerts, workOrders, spares, technicians] = await Promise.all([
    getPlantById(plantId),
    getAllMachines(plantId),
    getAlerts(plantId),
    getWorkOrders(plantId),
    getSpares(plantId),
    getTechnicians(plantId),
  ]);

  return (
    <MyTasksView
      initialPlant={plant}
      initialMachines={machines}
      initialAlerts={alerts}
      initialWorkOrders={workOrders}
      initialSpares={spares}
      initialTechnicians={technicians}
    />
  );
}
