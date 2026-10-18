import { ComingSoonPage } from '@/components/ComingSoonPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AgentConsolePage() {
  return (
    <ComingSoonPage
      module="Agent Console"
      route="/agent"
      description="Agent run log (latency, tokens, schema valid, guardrail pass), prompt versions, golden-set scorecard"
    />
  );
}
