import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  unstable_noStore: vi.fn(),
}));

import { NextRequest } from 'next/server';
import seedData from '@/data/seed_data.json';
import {
  isSparesConfirmed,
  isWindowConfirmed,
  normalizeSeededWorkOrders,
  getWorkflowStage,
  getWaitingForRole,
  WORKFLOW_STAGES,
} from '@/lib/workflow';
import {
  calculateLiveRiskScore,
  getConsequenceFactor,
  getSeverityFactor,
  getLikelihood,
  RISK_SCORE_TOOLTIP,
} from '@/lib/risk';
import { formatFailureMode } from '@/lib/lifecycle';
import { resetLocalStoreData, getLocalStoreData } from '@/lib/data/localStore';
import { POST as stepRoute } from '@/app/api/work-orders/[id]/step/route';
import { POST as resetRoute } from '@/app/api/demo/reset/route';

describe('Hotfix 06E: Workflow gating, seeded states, labels', () => {
  beforeEach(() => {
    resetLocalStoreData();
  });

  describe('1. AL-1001 failure mode consistency and demo reset overwrite', () => {
    it('seed data defines AL-1001 with failure_mode bearing_wear', () => {
      const al1001 = seedData.alerts.find((a: any) => a.id === 'AL-1001');
      expect(al1001).toBeDefined();
      expect(al1001?.failure_mode).toBe('bearing_wear');
      expect(formatFailureMode(al1001?.failure_mode)).toBe('Bearing wear');
    });

    it('resetLocalStoreData restores AL-1001 failure_mode as bearing_wear', () => {
      const store = getLocalStoreData();
      const al1001 = store.alerts.find((a: any) => a.id === 'AL-1001');
      expect(al1001?.failure_mode).toBe('bearing_wear');
    });

    it('demo reset endpoint resets store and returns success', async () => {
      const res = await resetRoute();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      const store = getLocalStoreData();
      const al1001 = store.alerts.find((a: any) => a.id === 'AL-1001');
      expect(al1001?.failure_mode).toBe('bearing_wear');
    });
  });

  describe('2. Execution gating enforced on work orders', () => {
    it('rejects step update on WO-2201 with 403 because clearances are pending', async () => {
      const req = new NextRequest('http://localhost:3000/api/work-orders/WO-2201/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_index: 0,
          done: true,
          technician_id: 'P07-T01',
          user_role: 'Technician',
        }),
      });

      const res = await stepRoute(req, { params: { id: 'WO-2201' } });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Pre-execution clearance required');
      expect(data.error).toContain('Spares (Stage 5)');
      expect(data.error).toContain('Maintenance Window (Stage 6)');
    });

    it('permits step update on WO-2202 because both spares and window are confirmed', async () => {
      const req = new NextRequest('http://localhost:3000/api/work-orders/WO-2202/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_index: 0,
          done: true,
          technician_id: 'P07-T03',
          user_role: 'Technician',
        }),
      });

      const res = await stepRoute(req, { params: { id: 'WO-2202' } });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.workOrder.checklist[0].done).toBe(true);
    });
  });

  describe('3. Seeded work order states after Reset demo', () => {
    it('normalizes WO-2201 as approved with unconfirmed spares and window', () => {
      const normalized = normalizeSeededWorkOrders(seedData.work_orders);
      const wo2201 = normalized.find((w) => w.id === 'WO-2201');
      expect(wo2201).toBeDefined();
      expect(wo2201?.status).toBe('approved');
      expect(isSparesConfirmed(wo2201)).toBe(false);
      expect(isWindowConfirmed(wo2201)).toBe(false);
      expect(wo2201?.loto_permit_no).toBeNull();
      expect(getWorkflowStage(undefined, wo2201)).toBe(5);
    });

    it('normalizes WO-2202 as in_progress with confirmed clearances and LOTO permit', () => {
      const normalized = normalizeSeededWorkOrders(seedData.work_orders);
      const wo2202 = normalized.find((w) => w.id === 'WO-2202');
      expect(wo2202).toBeDefined();
      expect(wo2202?.status).toBe('in_progress');
      expect(isSparesConfirmed(wo2202)).toBe(true);
      expect(isWindowConfirmed(wo2202)).toBe(true);
      expect(wo2202?.loto_permit_no).toBe('LOTO-P07-1187');
      expect(getWorkflowStage(undefined, wo2202)).toBe(7);
    });

    it('normalizes closed history work orders with both clearances confirmed', () => {
      const normalized = normalizeSeededWorkOrders(seedData.work_orders);
      const closedWos = normalized.filter((w) => w.status === 'closed');
      expect(closedWos.length).toBeGreaterThan(0);
      for (const closedWo of closedWos) {
        expect(isSparesConfirmed(closedWo)).toBe(true);
        expect(isWindowConfirmed(closedWo)).toBe(true);
        expect(getWorkflowStage(undefined, closedWo)).toBe(8);
      }
    });
  });

  describe('4. Stage 9 shows Completed instead of Waiting for: All Roles', () => {
    it('returns Completed for Stage 9 label and shortName', () => {
      expect(WORKFLOW_STAGES[9].shortName).toBe('Completed');
      expect(WORKFLOW_STAGES[9].role).toBe('Completed');
      expect(getWaitingForRole(9)).toBe('Completed');
    });
  });

  describe('5. Risk score formula for new live alerts', () => {
    it('calculates consequence factors: A = 1.0, B = 0.6, C = 0.3', () => {
      expect(getConsequenceFactor('A')).toBe(1.0);
      expect(getConsequenceFactor('B')).toBe(0.6);
      expect(getConsequenceFactor('C')).toBe(0.3);
    });

    it('calculates severity factors: P1/critical = 1.0, P2/alarm = 0.8, P3/watch = 0.5', () => {
      expect(getSeverityFactor('P1')).toBe(1.0);
      expect(getSeverityFactor('critical')).toBe(1.0);
      expect(getSeverityFactor('P2')).toBe(0.8);
      expect(getSeverityFactor('alarm')).toBe(0.8);
      expect(getSeverityFactor('P3')).toBe(0.5);
      expect(getSeverityFactor('watch')).toBe(0.5);
    });

    it('computes likelihood = severity_factor * confidence', () => {
      expect(getLikelihood('P1', 0.86)).toBeCloseTo(0.86, 2);
      expect(getLikelihood('P2', 0.80)).toBeCloseTo(0.64, 2);
    });

    it('computes risk = likelihood x consequence x 100 and health = 100 - risk', () => {
      // Criticality A (1.0), P1 (1.0), confidence 0.86 => likelihood 0.86 => risk 86, health 14
      const resultA = calculateLiveRiskScore({
        criticality: 'A',
        severityOrUrgency: 'P1',
        confidence: 0.86,
      });
      expect(resultA.risk).toBe(86);
      expect(resultA.health).toBe(14);

      // Criticality B (0.6), P2 (0.8), confidence 0.80 => likelihood 0.64 => risk 0.64 * 0.6 * 100 = 38.4 -> 38
      const resultB = calculateLiveRiskScore({
        criticality: 'B',
        severityOrUrgency: 'P2',
        confidence: 0.80,
      });
      expect(resultB.risk).toBe(38);
      expect(resultB.health).toBe(62);
    });

    it('provides descriptive RISK_SCORE_TOOLTIP', () => {
      expect(RISK_SCORE_TOOLTIP).toContain('Risk score = Likelihood × Consequence × 100');
      expect(RISK_SCORE_TOOLTIP).toContain('Health = 100 - Risk');
    });

    it('seeded alerts retain their seed values and are not overwritten by live formula', () => {
      const store = getLocalStoreData();
      const al1001 = store.alerts.find((a: any) => a.id === 'AL-1001');
      expect(al1001?.risk_score).toBe(88);
      const al1004 = store.alerts.find((a: any) => a.id === 'AL-1004');
      expect(al1004?.risk_score).toBe(64);
    });
  });
});
