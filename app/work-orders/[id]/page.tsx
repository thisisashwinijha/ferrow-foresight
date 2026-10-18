import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getWorkOrderById } from '@/lib/data/workOrders';
import { getMachineById } from '@/lib/data/machines';
import { getAlertById } from '@/lib/data/alerts';
import { getPlantById } from '@/lib/data/plants';
import { getLineById } from '@/lib/data/lines';
import { getTechnicians } from '@/lib/data/technicians';
import { getSpares } from '@/lib/data/spares';
import { WorkOrderExecutionView } from '@/components/WorkOrderExecutionView';

export const dynamic = 'force-dynamic';

export default async function WorkOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const workOrder = await getWorkOrderById(params.id);

  if (!workOrder) {
    return (
      <div className="max-w-[700px] mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mx-auto text-ink-muted">
          <ArrowLeft className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-semibold text-ink">Work order not found</h1>
        <p className="text-xs text-ink-muted">
          No work order matching identifier <span className="font-mono font-medium">{params.id}</span> exists in the system.
        </p>
        <Link
          href="/work-orders"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-btn bg-ink text-canvas text-xs font-medium hover:opacity-90 transition-opacity"
        >
          Return to Work orders
        </Link>
      </div>
    );
  }

  const [machine, alert, plant, technicians, spares] = await Promise.all([
    getMachineById(workOrder.machine_id, workOrder.plant_id),
    workOrder.alert_id ? getAlertById(workOrder.alert_id, workOrder.plant_id) : Promise.resolve(undefined),
    getPlantById(workOrder.plant_id),
    getTechnicians(workOrder.plant_id),
    getSpares(workOrder.plant_id),
  ]);

  if (!machine) {
    return (
      <div className="max-w-[700px] mx-auto py-16 text-center space-y-4">
        <h1 className="text-xl font-semibold text-ink">Associated Machine Not Found</h1>
        <p className="text-xs text-ink-muted">
          Work order {workOrder.id} references machine {workOrder.machine_id}, which was not found in the registry.
        </p>
        <Link
          href="/work-orders"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-btn bg-ink text-canvas text-xs font-medium hover:opacity-90 transition-opacity"
        >
          Return to Work orders
        </Link>
      </div>
    );
  }

  const line = await getLineById(machine.line_id, workOrder.plant_id);

  return (
    <WorkOrderExecutionView
      initialWorkOrder={workOrder}
      machine={machine}
      alert={alert}
      plant={plant}
      line={line}
      technicians={technicians}
      spares={spares}
    />
  );
}
