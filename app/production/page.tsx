import { ComingSoonPage } from '@/components/ComingSoonPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ProductionCoordinationPage() {
  return (
    <ComingSoonPage
      module="Production Coordination"
      route="/production"
      description="14-day x 3-line x 3-shift grid, window types colour-coded, scheduled maintenance overlaid, production loss per proposed slot"
    />
  );
}
