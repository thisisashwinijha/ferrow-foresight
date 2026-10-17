import { ComingSoonPage } from '@/components/ComingSoonPage';

export default function MaintenancePlanningPage() {
  return (
    <ComingSoonPage
      module="Maintenance Planning"
      route="/planning"
      description="Strategy mix (BM/PM/CBM/RBM), risk matrix (criticality x probability), PM plan with AI keep / defer / pull-forward and reasons, accept or override"
    />
  );
}
