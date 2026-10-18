export type AgentType = 'triage' | 'pm_optimiser' | 'copilot' | 'knowledge' | 'interpreter';
export type AgentName = AgentType;

export type AgentProviderName = 'make' | 'direct' | 'direct_fallback' | 'remote' | 'cached';

export interface AgentContext {
  [key: string]: any;
}

export interface AgentExecuteOptions {
  agent: AgentType;
  request_id?: string;
  plant_id?: string;
  machine_id?: string;
  trigger?: string;
  prompt_version?: string;
  interpreter_input?: any;
  triage_context?: any;
  context?: AgentContext;
  user_text?: string;
  clientIp?: string;
  forceProvider?: AgentProviderName;
  skipLive?: boolean; // e.g. for DEMO_MODE pre-seeded runs
  bypassRateLimit?: boolean;
  ruleBasedFallback?: () => Promise<any> | any;
}

export interface AgentExecutionResult<T = any> {
  success: boolean;
  data: T;
  provider: AgentProviderName;
  model: string;
  prompt_version: string;
  latency_ms: number;
  tokens?: {
    input: number;
    output: number;
  };
  schema_valid: boolean;
  guardrail_pass: boolean;
  fallback_used: boolean;
  fallback_chain: AgentProviderName[];
  cached_note?: string;
  error?: string;
}

export interface AgentRunRecord {
  id?: number | string;
  alert_id?: string | null;
  created_at?: string;
  step: string;
  model: string;
  prompt_version: string;
  latency_ms: number;
  input_tokens?: number | null;
  output_tokens?: number | null;
  input: any;
  output: any;
  schema_valid: boolean;
  guardrail_pass: boolean;
  error?: string | null;
}
