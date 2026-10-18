import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { pmOptimiserService } from '@/lib/pmOptimiserService';
import { checkPmDueDate } from '@/lib/guardrails';
import { resetLocalStoreData } from '@/lib/data/localStore';

describe('PM Optimiser Service & Schedule Guardrail', () => {
  beforeEach(() => {
    resetLocalStoreData();
  });

  it('runs pmOptimiserService and returns decisions matching prompt schema', async () => {
    const result = await pmOptimiserService('P-07');

    expect(result).toBeDefined();
    expect(result.plant_id).toBe('P-07');
    expect(result.summary).toBeDefined();
    expect(result.summary.tasks_reviewed).toBeGreaterThan(0);
    expect(result.summary.visits_avoided).toBe(result.summary.defer);
    expect(result.summary.technician_hours_saved).toBeGreaterThan(0);
    expect(result.summary.headline).toBeTypeOf('string');

    expect(result.decisions.length).toBe(result.summary.tasks_reviewed);

    for (const d of result.decisions) {
      expect(['keep', 'defer', 'pull_forward']).toContain(d.decision);
      expect(d.current_due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(d.new_due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(d.confidence).toBeGreaterThanOrEqual(0.7);
      expect(d.reason.length).toBeGreaterThan(5);
      expect(d.evidence_ids.length).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(d.risk_if_wrong);
    }
  });

  it('enforces guardrail: keep and pull_forward may NEVER move a date later', async () => {
    const result = await pmOptimiserService('P-07');

    for (const d of result.decisions) {
      if (d.decision === 'keep' || d.decision === 'pull_forward') {
        const originalDate = new Date(d.current_due_date).getTime();
        const targetDate = new Date(d.new_due_date).getTime();
        expect(targetDate).toBeLessThanOrEqual(originalDate);

        const guardrailCheck = checkPmDueDate(d.decision, d.current_due_date, d.new_due_date);
        expect(guardrailCheck.pass).toBe(true);
      }
    }
  });

  it('fails guardrail check if keep or pull_forward attempts to defer a date', () => {
    const invalidPull = checkPmDueDate('pull_forward', '2026-10-20', '2026-10-25');
    expect(invalidPull.pass).toBe(false);
    expect(invalidPull.failBehavior).toBe('needs_review');

    const invalidKeep = checkPmDueDate('keep', '2026-10-20', '2026-10-22');
    expect(invalidKeep.pass).toBe(false);

    const validDefer = checkPmDueDate('defer', '2026-10-20', '2026-11-20');
    expect(validDefer.pass).toBe(true);

    const validPull = checkPmDueDate('pull_forward', '2026-10-20', '2026-10-18');
    expect(validPull.pass).toBe(true);
  });

  it('pulls forward PM task for P07-M03 which has an open alert', async () => {
    const result = await pmOptimiserService('P-07');
    const m03Task = result.decisions.find((d) => d.machine_id === 'P07-M03');

    expect(m03Task).toBeDefined();
    expect(m03Task?.decision).toBe('pull_forward');
    expect(m03Task?.evidence_ids.some((id) => id.startsWith('AL-'))).toBe(true);
  });
});
