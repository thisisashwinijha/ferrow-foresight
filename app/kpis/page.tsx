import { getKpiSnapshots } from '@/lib/data/kpis';
import { getOnboardedPlants } from '@/lib/data/plants';
import { getAlerts } from '@/lib/data/alerts';
import { KpisDashboardView } from '@/components/KpisDashboardView';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function KpisPage({
  searchParams,
}: {
  searchParams?: { plant?: string };
}) {
  noStore();
  const activePlantId = searchParams?.plant || 'P-07';

  const [initialSnapshots, allSnapshots, plants, alerts, allAlerts] = await Promise.all([
    getKpiSnapshots(activePlantId),
    getKpiSnapshots('all'),
    getOnboardedPlants(),
    getAlerts(activePlantId),
    getAlerts('all'),
  ]);

  return (
    <KpisDashboardView
      initialSnapshots={initialSnapshots}
      allSnapshots={allSnapshots}
      plants={plants}
      alerts={alerts}
      allAlerts={allAlerts}
    />
  );
}
