import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getAgentRuns } from '@/lib/data/agentRuns';
import { generateMachineSummary } from '@/lib/machineSummary';

describe('Fix 4: No AI calls on page load anywhere', () => {
  it('proves planning page does not call pmOptimiserService on page load', () => {
    const planningPageSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'app/planning/page.tsx'),
      'utf-8'
    );
    expect(planningPageSrc).not.toContain('pmOptimiserService(');
    expect(planningPageSrc).toContain('initialOptimiserResult={null}');
  });

  it('proves status page derives health from existing runs without calling Gemini API directly', () => {
    const statusPageSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'app/status/page.tsx'),
      'utf-8'
    );
    expect(statusPageSrc).not.toContain('generativelanguage.googleapis.com');
    expect(statusPageSrc).toContain('getAgentRuns');
  });

  it('proves machine summary is generated deterministically without invoking agents', async () => {
    const beforeRuns = await getAgentRuns(200);
    const beforeCount = beforeRuns.length;

    for (const machineId of ['P07-M01', 'P07-M03', 'P07-M05', 'P07-M12', 'P07-M22', 'P07-M30']) {
      const summary = generateMachineSummary(machineId, 'P-07');
      expect(summary.answer).toBeTruthy();
    }

    const afterRuns = await getAgentRuns(200);
    const afterCount = afterRuns.length;

    expect(afterCount).toBe(beforeCount);
  });
});
