import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getMachineById } from '@/lib/data/machines';
import { getPlantById } from '@/lib/data/plants';
import { getLineById } from '@/lib/data/lines';
import { getSensorReadingsForMachine } from '@/lib/data/sensorReadings';
import { getObservations } from '@/lib/data/observations';
import { getMaintenanceLogs } from '@/lib/data/maintenanceLog';
import { getAlerts } from '@/lib/data/alerts';
import { getWorkOrders } from '@/lib/data/workOrders';
import { getSparesByMachineType } from '@/lib/data/spares';
import { getKnowledgeLibrary } from '@/lib/data/knowledge';
import { getTechnicians } from '@/lib/data/technicians';
import { MachineHistoryCard } from '@/components/MachineHistoryCard';

export const dynamic = 'force-dynamic';

export default async function MachineDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const machine = await getMachineById(params.id);

  if (!machine) {
    return (
      <div className="max-w-[800px] mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mx-auto text-ink-muted">
          <ArrowLeft className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-semibold text-ink">Machine not found</h1>
        <p className="text-xs text-ink-muted">
          No equipment with identifier <span className="font-mono font-medium">{params.id}</span> exists in the registry.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-btn bg-ink text-canvas text-xs font-medium hover:opacity-90 transition-opacity"
        >
          Return to Control room
        </Link>
      </div>
    );
  }

  const [
    plant,
    line,
    readings,
    observations,
    maintenanceLogs,
    allAlerts,
    allWorkOrders,
    spares,
    knowledge,
    technicians,
  ] = await Promise.all([
    getPlantById(machine.plant_id),
    getLineById(machine.line_id, machine.plant_id),
    machine.has_sensors ? getSensorReadingsForMachine(machine.id) : Promise.resolve([]),
    getObservations(machine.plant_id, undefined, machine.id),
    getMaintenanceLogs(machine.plant_id, undefined, machine.id),
    getAlerts(machine.plant_id),
    getWorkOrders(machine.plant_id),
    getSparesByMachineType(machine.type, machine.plant_id),
    getKnowledgeLibrary(machine.plant_id, undefined, machine.type),
    getTechnicians(machine.plant_id),
  ]);

  const machineAlerts = allAlerts.filter((a) => a.machine_id === machine.id);
  const machineWorkOrders = allWorkOrders.filter((w) => w.machine_id === machine.id);

  return (
    <MachineHistoryCard
      machine={machine}
      plant={plant}
      line={line}
      initialReadings={readings}
      observations={observations}
      maintenanceLogs={maintenanceLogs}
      alerts={machineAlerts}
      workOrders={machineWorkOrders}
      spares={spares}
      knowledge={knowledge}
      pmPlans={[]}
      technicians={technicians}
    />
  );
}
