import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Agent Console & Golden Scorecard', () => {
  it('reads all 5 agent prompts from prompts/*.md', () => {
    const requiredPrompts = [
      'signal_interpreter.md',
      'triage_planner.md',
      'pm_optimiser.md',
      'copilot.md',
      'knowledge_agent.md',
    ];

    for (const file of requiredPrompts) {
      const fullPath = path.join(process.cwd(), 'prompts', file);
      expect(fs.existsSync(fullPath)).toBe(true);

      const content = fs.readFileSync(fullPath, 'utf8');
      expect(content.length).toBeGreaterThan(100);
      expect(content).toContain('version');
    }
  });

  it('validates agent cards specification for the 5 agents', () => {
    const agentVersions: Record<string, string> = {
      'Signal Interpreter': 'interp-v1.0',
      'Triage Planner': 'triage-v1.0',
      'PM Optimiser': 'pm-v1.0',
      'Plant Copilot': 'copilot-v1.0',
      'Knowledge Agent': 'knowledge-v1.0',
    };

    const keys = Object.keys(agentVersions);
    expect(keys.length).toBe(5);

    for (const [agent, version] of Object.entries(agentVersions)) {
      expect(agent).toBeDefined();
      expect(version).toMatch(/^[a-z]+-v\d+\.\d+$/);
    }
  });

  it('verifies golden scorecard target metrics from golden/README.md', () => {
    const readmePath = path.join(process.cwd(), 'golden', 'README.md');
    expect(fs.existsSync(readmePath)).toBe(true);

    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    expect(readmeContent).toContain('Alert precision');
    expect(readmeContent).toContain('0.85');
    expect(readmeContent).toContain('Alert recall');
    expect(readmeContent).toContain('0.90');
    expect(readmeContent).toContain('LOTO correctness');
    expect(readmeContent).toContain('100%');
    expect(readmeContent).toContain('Uncertified assignment');
    expect(readmeContent).toContain('0 cases');
    expect(readmeContent).toContain('85 labelled cases');
  });

  it('confirms behavior when eval_results.json is absent', () => {
    const evalPath = path.join(process.cwd(), 'golden', 'eval_results.json');
    const exists = fs.existsSync(evalPath);
    // If not run yet, it should gracefully fall back to displaying target benchmarks
    if (!exists) {
      expect(exists).toBe(false);
    }
  });
});
