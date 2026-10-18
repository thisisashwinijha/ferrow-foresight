import { getPlants } from '@/lib/data/plants';
import { NetworkView } from '@/components/NetworkView';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function NetworkPage() {
  noStore();
  const plants = await getPlants();
  return <NetworkView initialPlants={plants} />;
}
