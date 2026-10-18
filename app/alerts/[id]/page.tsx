import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getAlertById } from '@/lib/data/alerts';
import { getMachineById } from '@/lib/data/machines';
import { getPlantById } from '@/lib/data/plants';
import { getLineById } from '@/lib/data/lines';
import { getTechnicians, getCertifications } from '@/lib/data/technicians';
import { getSpares } from '@/lib/data/spares';
import { getWorkOrders } from '@/lib/data/workOrders';
import { unstable_noStore as noStore } from 'next/cache';
import { AlertDetailView } from '@/components/AlertDetailView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AlertDetailPage({
  params,
}: {
  params: { id: string };
}) {
  noStore();
  const alert = await getAlertById(params.id);

  if (!alert) {
    return (
      <div className="max-w-[700px] mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mx-auto text-ink-muted">
          <ArrowLeft className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-semibold text-ink">Alert not found</h1>
        <p className="text-xs text-ink-muted">
          No triage alert matching identifier <span className="font-mono font-medium">{params.id}</span> exists in the system.
        </p>
        <Link
          href="/alerts"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-btn bg-ink text-canvas text-xs font-medium hover:opacity-90 transition-opacity"
        >
          Return to Triage list
        </Link>
      </div>
    );
  }

  const machine = await getMachineById(alert.machine_id, alert.plant_id);

  if (!machine) {
    return (
      <div className="max-w-[700px] mx-auto py-16 text-center space-y-4">
        <h1 className="text-xl font-semibold text-ink">Associated Machine Not Found</h1>
        <p className="text-xs text-ink-muted">
          Alert {alert.id} references machine {alert.machine_id}, which was not found in the registry.
        </p>
        <Link
          href="/alerts"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-btn bg-ink text-canvas text-xs font-medium hover:opacity-90 transition-opacity"
        >
          Return to Triage list
        </Link>
      </div>
    );
  }

  const [plant, line, technicians, certifications, liveSpares, workOrders] =
    await Promise.all([
      getPlantById(alert.plant_id || machine.plant_id),
      getLineById(alert.proposed_window?.line_id || machine.line_id, alert.plant_id),
      getTechnicians(alert.plant_id || machine.plant_id),
      getCertifications(alert.plant_id || machine.plant_id),
      getSpares(alert.plant_id || machine.plant_id),
      getWorkOrders(alert.plant_id || machine.plant_id),
    ]);

  const existingWorkOrder = workOrders.find((w) => w.alert_id === alert.id);

  return (
    <AlertDetailView
      initialAlert={alert}
      machine={machine}
      plant={plant}
      line={line}
      technicians={technicians}
      certifications={certifications}
      liveSpares={liveSpares}
      existingWorkOrder={existingWorkOrder}
    />
  );
}
