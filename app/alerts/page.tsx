import React from 'react';
import { getAlerts } from '@/lib/data/alerts';
import { getAllMachines } from '@/lib/data/machines';
import { getPlants } from '@/lib/data/plants';
import { unstable_noStore as noStore } from 'next/cache';
import { AlertsListView } from '@/components/AlertsListView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: { plant?: string; line?: string };
}) {
  noStore();
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
