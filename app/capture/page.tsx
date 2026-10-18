import React from 'react';
import { getAllMachines } from '@/lib/data/machines';
import { getPlants } from '@/lib/data/plants';
import { getLines } from '@/lib/data/lines';
import { getTechnicians } from '@/lib/data/technicians';
import { TechnicianCaptureView } from '@/components/TechnicianCaptureView';

export const dynamic = 'force-dynamic';

export default async function TechnicianCapturePage() {
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
