import { ComingSoonPage } from '@/components/ComingSoonPage';

export default function KpiDashboardPage() {
  return (
    <ComingSoonPage
      module="KPI Dashboard"
      route="/kpis"
      description="MTBF, MTTR, availability, planned maintenance %, PM compliance, wasted PM %, breakdown hours, downtime cost, false alarm rate, stockouts, backlog"
    />
  );
}
