import { ComingSoonPage } from '@/components/ComingSoonPage';

export const dynamic = 'force-static';

export default function AboutPage() {
  return (
    <ComingSoonPage
      module="About Ferrow Foresight (For Assessors)"
      route="/about"
      description="Architecture diagram, demo walkthrough, links to repo and deck"
    />
  );
}
