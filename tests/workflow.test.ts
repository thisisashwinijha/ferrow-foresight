import { describe, it, expect } from 'vitest';
import {
  WORKFLOW_STAGES,
  getWorkflowStage,
  checkWorkflowPermission,
  validateWorkflowInvariants,
} from '@/lib/workflow';
import { Alert, WorkOrder } from '@/lib/types';

describe('Workflow Engine (lib/workflow.ts)', () => {
  it('defines the 9 sequential workflow stages', () => {
    const stages = Object.values(WORKFLOW_STAGES);
    expect(stages).toHaveLength(9);
    expect(stages.map((s) => s.stage)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(stages[0].name).toBe('Detect');
    expect(stages[1].name).toBe('AI Triage');
    expect(stages[2].name).toBe('Planner Review');
    expect(stages[3].name).toBe('Plant Head Approval');
    expect(stages[4].name).toBe('Spares Readiness');
    expect(stages[5].name).toBe('Production Window');
    expect(stages[6].name).toBe('LOTO & Execution');
    expect(stages[7].name).toBe('Knowledge & Verification');
    expect(stages[8].name).toBe('Restored to Normal');
  });

  describe('getWorkflowStage', () => {
    it('returns Stage 1 (Detect) when no alert or work order is raised yet', () => {
      const stage = getWorkflowStage(undefined, undefined, false);
      expect(stage).toBe(1);
    });

    it('returns Stage 2 (AI Triage) for an alert currently undergoing triage', () => {
      const alert: Partial<Alert> = {
        id: 'AL-9001',
        status: 'triage_in_progress' as any,
        machine_id: 'P07-M05',
      };
      const stage = getWorkflowStage(alert as Alert, undefined, false);
      expect(stage).toBe(2);
    });

    it('returns Stage 3 (Planner Review) for pending alert needing human sign-off', () => {
      const alert: Partial<Alert> = {
        id: 'AL-9002',
        status: 'needs_review',
        urgency: 'P2',
        machine_id: 'P07-M05',
      };
      const stage = getWorkflowStage(alert as Alert, undefined, false);
      expect(stage).toBe(3);
    });

    it('returns Stage 4 (Plant Head Approval) when Planner sends P1 Criticality A alert to Plant Head', () => {
      const alert: Partial<Alert> = {
        id: 'AL-1001',
        status: 'pending',
        urgency: 'P1',
        machine_id: 'P07-M03',
        decision_reason: 'sent_to_plant_head',
      };
      const stage = getWorkflowStage(alert as Alert, undefined, false);
      expect(stage).toBe(4);
    });

    it('returns Stage 5 (Spares Readiness) when alert approved and work order approved without spares confirmed', () => {
      const alert: Partial<Alert> = { id: 'AL-1001', status: 'approved', urgency: 'P1' };
      const wo: Partial<WorkOrder> = {
        id: 'WO-1001',
        status: 'approved',
        spares_reserved: [],
        scheduled_window: { date: '2026-03-22', shift: 'A' },
      };
      const stage = getWorkflowStage(alert as Alert, wo as WorkOrder, false);
      expect(stage).toBe(5);
    });

    it('returns Stage 6 (Production Window) when spares are confirmed but window is unconfirmed', () => {
      const alert: Partial<Alert> = { id: 'AL-1001', status: 'approved' };
      const wo: Partial<WorkOrder> = {
        id: 'WO-1001',
        status: 'approved',
        spares_reserved: [{ part_id: 'SP-01', confirmed: true } as any],
        scheduled_window: { date: '2026-03-22', shift: 'A', confirmed: false },
      };
      const stage = getWorkflowStage(alert as Alert, wo as WorkOrder, false);
      expect(stage).toBe(6);
    });

    it('returns Stage 7 (LOTO & Execution) when both spares and window are confirmed or work order is scheduled/in_progress', () => {
      const alert: Partial<Alert> = { id: 'AL-1001', status: 'approved' };
      const wo: Partial<WorkOrder> = {
        id: 'WO-1001',
        status: 'scheduled',
        spares_reserved: [{ part_id: 'SP-01', confirmed: true } as any],
        scheduled_window: { date: '2026-03-22', shift: 'A', confirmed: true },
      };
      const stage = getWorkflowStage(alert as Alert, wo as WorkOrder, false);
      expect(stage).toBe(7);
    });

    it('returns Stage 8 (Knowledge & Verification) when work order is closed but knowledge not yet verified', () => {
      const alert: Partial<Alert> = { id: 'AL-1001', status: 'resolved' };
      const wo: Partial<WorkOrder> = {
        id: 'WO-1001',
        status: 'closed',
        closed_at: '2026-03-18T10:00:00Z',
      };
      const stage = getWorkflowStage(alert as Alert, wo as WorkOrder, false);
      expect(stage).toBe(8);
    });

    it('returns Stage 9 (Restored to Normal) when work order is closed and knowledge card is verified', () => {
      const alert: Partial<Alert> = { id: 'AL-1001', status: 'resolved' };
      const wo: Partial<WorkOrder> = {
        id: 'WO-1001',
        status: 'closed',
        closed_at: '2026-03-18T10:00:00Z',
      };
      const stage = getWorkflowStage(alert as Alert, wo as WorkOrder, true);
      expect(stage).toBe(9);
    });
  });

  describe('Role-gating with checkWorkflowPermission', () => {
    it('allows Maintenance Planner to approve P2/P3 alerts', () => {
      const perm = checkWorkflowPermission('planner_approve', 'Maintenance Planner');
      expect(perm.allowed).toBe(true);
    });

    it('blocks Maintenance Planner from approving P1 Criticality A alerts directly', () => {
      const perm = checkWorkflowPermission('planner_approve', 'Maintenance Planner', {
        alert: { id: 'AL-1001', urgency: 'P1', criticality: 'A' } as any,
      });
      expect(perm.allowed).toBe(false);
      expect(perm.reason).toContain('Plant Head');
    });

    it('allows Plant Head to approve P1 Criticality A alerts', () => {
      const perm = checkWorkflowPermission('plant_head_approve', 'Plant Head');
      expect(perm.allowed).toBe(true);
    });

    it('allows Stores In-charge to confirm spares reservation and raise purchase requests', () => {
      expect(checkWorkflowPermission('confirm_spares', 'Stores In-charge').allowed).toBe(true);
      expect(checkWorkflowPermission('raise_purchase_request', 'Stores In-charge').allowed).toBe(true);
      expect(checkWorkflowPermission('confirm_spares', 'Technician').allowed).toBe(false);
    });

    it('allows Production Manager to confirm maintenance window and request reschedule', () => {
      expect(checkWorkflowPermission('confirm_window', 'Production Manager').allowed).toBe(true);
      expect(checkWorkflowPermission('request_reschedule', 'Production Manager').allowed).toBe(true);
      expect(checkWorkflowPermission('confirm_window', 'Maintenance Planner').allowed).toBe(false);
    });

    it('allows assigned Technician to execute LOTO and tasks, blocks other roles', () => {
      expect(checkWorkflowPermission('apply_loto', 'Technician').allowed).toBe(true);
      expect(checkWorkflowPermission('execute_task', 'Technician').allowed).toBe(true);
      expect(checkWorkflowPermission('close_work_order', 'Technician').allowed).toBe(true);
      expect(checkWorkflowPermission('apply_loto', 'Plant Head').allowed).toBe(false);
    });

    it('allows Training Coordinator to verify knowledge card, blocks others', () => {
      expect(checkWorkflowPermission('verify_knowledge', 'Training Coordinator').allowed).toBe(true);
      expect(checkWorkflowPermission('verify_knowledge', 'Technician').allowed).toBe(false);
    });

    it('enforces Shadow mode for Stuttgart, Monterrey, Suzhou', () => {
      const perm = checkWorkflowPermission('planner_approve', 'Maintenance Planner', 'P-08'); // Stuttgart
      expect(perm.allowed).toBe(false);
      expect(perm.reason).toContain('Shadow mode');
    });
  });

  describe('validateWorkflowInvariants', () => {
    it('blocks execution when spares or window are unconfirmed', () => {
      const wo: Partial<WorkOrder> = {
        id: 'WO-1001',
        status: 'approved',
        spares_reserved: [],
        scheduled_window: { date: '2026-03-22', shift: 'A' },
      };
      const check = validateWorkflowInvariants({
        action: 'execute_task',
        workOrder: wo as WorkOrder,
      });
      expect(check.valid).toBe(false);
      expect(check.error).toContain('spares');
    });

    it('allows execution when both spares and window are confirmed', () => {
      const wo: Partial<WorkOrder> = {
        id: 'WO-1001',
        status: 'scheduled',
        spares_reserved: [{ part_id: 'SP-01', confirmed: true } as any],
        scheduled_window: { date: '2026-03-22', shift: 'A', confirmed: true },
      };
      const check = validateWorkflowInvariants({
        action: 'execute_task',
        workOrder: wo as WorkOrder,
      });
      expect(check.valid).toBe(true);
    });

    it('blocks closure when checklist steps remain unverified', () => {
      const wo: Partial<WorkOrder> = {
        id: 'WO-1001',
        status: 'in_progress',
        checklist: [
          { step: 'LOTO 1', done: true },
          { step: 'Task 1', done: false },
        ],
      };
      const check = validateWorkflowInvariants({
        action: 'close_work_order',
        workOrder: wo as WorkOrder,
      });
      expect(check.valid).toBe(false);
      expect(check.error).toContain('checklist');
    });
  });
});
