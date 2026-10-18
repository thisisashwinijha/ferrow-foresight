import React from 'react';
import { getAllMachines } from '@/lib/data/machines';
import { getPlants } from '@/lib/data/plants';
import { getLines } from '@/lib/data/lines';
import { getTechnicians } from '@/lib/data/technicians';
import { unstable_noStore as noStore } from 'next/cache';
import { TechnicianCaptureView } from '@/components/TechnicianCaptureView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TechnicianCapturePage() {
  noStore();
  const [machines, plants, lines, technicians] = await Promise.all([
    getAllMachines(),
    getPlants(),
    getLines(),
    getTechnicians(),
  ]);

  return (
    <TechnicianCaptureView
      initialMachines={machines}
      plants={plants}
      lines={lines}
      technicians={technicians}
    />
  );
}
