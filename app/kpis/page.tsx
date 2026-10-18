import { ComingSoonPage } from '@/components/ComingSoonPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function KpiDashboardPage() {
  return (
    <ComingSoonPage
      module="KPI Dashboard"
      route="/kpis"
      description="MTBF, MTTR, availability, planned maintenance %, PM compliance, wasted PM %, breakdown hours, downtime cost, false alarm rate, stockouts, backlog"
    />
  );
}
