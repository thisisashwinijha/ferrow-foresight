import React from 'react';
import { getAlerts } from '@/lib/data/alerts';
import { getAllMachines } from '@/lib/data/machines';
import { getPlants } from '@/lib/data/plants';
import { AlertsListView } from '@/components/AlertsListView';

export const dynamic = 'force-dynamic';

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: { plant?: string; line?: string };
}) {
  const plantId = searchParams.plant || 'P-07';
  const lineId = searchParams.line;

  const [alerts, machines, plants] = await Promise.all([
    getAlerts(plantId, lineId),
    getAllMachines(),
    getPlants(),
  ]);

  return (
    <AlertsListView
      initialAlerts={alerts}
      machines={machines}
      plants={plants}
    />
  );
}
