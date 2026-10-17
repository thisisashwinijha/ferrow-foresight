import { ComingSoonPage } from '@/components/ComingSoonPage';

export default function AgentConsolePage() {
  return (
    <ComingSoonPage
      module="Agent Console"
      route="/agent"
      description="Agent run log (latency, tokens, schema valid, guardrail pass), prompt versions, golden-set scorecard"
    />
  );
}
