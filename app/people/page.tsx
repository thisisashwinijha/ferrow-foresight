import { ComingSoonPage } from '@/components/ComingSoonPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function SkillsAndDevelopmentPage() {
  return (
    <ComingSoonPage
      module="Skills & Development"
      route="/people"
      description="Skill matrix heatmap (level 1 to 4 vs target), certification expiry, knowledge library of veteran failure signatures, suggested veteran + junior pairings"
    />
  );
}
