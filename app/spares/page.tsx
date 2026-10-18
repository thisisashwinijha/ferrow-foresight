import { ComingSoonPage } from '@/components/ComingSoonPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function SparesReadinessPage() {
  return (
    <ComingSoonPage
      module="Spares Readiness"
      route="/spares"
      description="Stock vs min, lead time, critical flag, reserved qty, readiness % per upcoming job, stockout alerts"
    />
  );
}
