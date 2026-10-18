import fs from 'fs';
import path from 'path';
import { AgentType } from './types';

const promptCache: Partial<Record<string, string>> = {};

/**
 * Reads system prompt files from make/system_*.txt.
 * Uses in-memory caching to avoid redundant disk reads.
 */
export function getSystemPrompt(type: AgentType | 'interpreter'): string {
  if (promptCache[type]) {
    return promptCache[type]!;
  }

  let filename = '';
  switch (type) {
    case 'interpreter':
      filename = 'system_interpreter.txt';
      break;
    case 'triage':
      filename = 'system_triage.txt';
      break;
    case 'pm_optimiser':
      filename = 'system_pm_optimiser.txt';
      break;
    case 'copilot':
      filename = 'system_copilot.txt';
      break;
    case 'knowledge':
      filename = 'system_knowledge.txt';
      break;
    default:
      filename = 'system_triage.txt';
  }

  try {
    const fullPath = path.resolve(process.cwd(), 'make', filename);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      promptCache[type] = content;
      return content;
    }
  } catch (e) {
    console.warn(`Could not read make/${filename}:`, e);
  }

  return '';
}

export function getDefaultPromptVersion(agent: AgentType): string {
  switch (agent) {
    case 'triage':
      return 'triage-v1.0';
    case 'pm_optimiser':
      return 'pm-v1.0';
    case 'copilot':
      return 'copilot-v1.0';
    case 'knowledge':
      return 'knowledge-v1.0';
    case 'interpreter':
      return 'interp-v1.0';
    default:
      return 'v1.0';
  }
}
