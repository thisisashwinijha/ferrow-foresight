import { describe, it, expect } from 'vitest';
import {
  getRequiredCertificationsForAlert,
  evaluateTechnicianCerts,
  assessTechnicianAssignment,
  getQualifyingTechniciansForShift,
  getCrossShiftOptions,
  getEligibleShadowTechnicians,
  TODAY_REFERENCE_DATE,
} from '../lib/technicianAssignment';
import { runAllGuardrails } from '../lib/guardrails';
import { getSeedData } from '../lib/data/db';
import { Technician, Certification } from '../lib/types';
import { formatShiftFull, formatShiftShort } from '../lib/shifts';

describe('Technician Assignment Logic (Hotfix 06C)', () => {
  const seed = getSeedData();
  const technicians = seed.technicians as Technician[];
  const certifications = seed.certifications as Certification[];

  describe('Required Certifications Rules', () => {
    it('derives Mechanical + LOTO for bearing wear with LOTO required', () => {
      const certs = getRequiredCertificationsForAlert({
        failureMode: 'bearing_wear',
        lotoRequired: true,
      });
      expect(certs).toContain('Mechanical');
      expect(certs).toContain('LOTO');
      expect(certs).not.toContain('Vibration Analysis Level II');
    });

    it('derives Electrical HT + LOTO for P07-M30 MCC electrical fault', () => {
      const certs = getRequiredCertificationsForAlert({
        failureMode: 'electrical_fault',
        lotoRequired: true,
        machineId: 'P07-M30',
        note: 'High voltage flash in MCC panel',
      });
      expect(certs).toContain('Electrical HT');
      expect(certs).toContain('LOTO');
      expect(certs).not.toContain('Electrical LV');
    });

    it('derives Electrical LV for motor overheating', () => {
      const certs = getRequiredCertificationsForAlert({
        failureMode: 'motor_overheating',
        lotoRequired: false,
      });
      expect(certs).toContain('Electrical LV');
      expect(certs).not.toContain('LOTO');
    });

    it('derives Hydraulics + LOTO for hydraulic leak', () => {
      const certs = getRequiredCertificationsForAlert({
        failureMode: 'hydraulic_leak',
        lotoRequired: true,
      });
      expect(certs).toContain('Hydraulics');
      expect(certs).toContain('LOTO');
    });

    it('derives Pneumatics + LOTO for pneumatic leak', () => {
      const certs = getRequiredCertificationsForAlert({
        failureMode: 'pneumatic_leak',
        lotoRequired: true,
      });
      expect(certs).toContain('Pneumatics');
      expect(certs).toContain('LOTO');
    });

    it('derives Instrumentation for sensor fault', () => {
      const certs = getRequiredCertificationsForAlert({
        failureMode: 'sensor_fault',
        lotoRequired: false,
      });
      expect(certs).toContain('Instrumentation');
    });
  });

  describe('Shift B Mechanical + LOTO Qualifying Technicians at P-07', () => {
    it('includes P07-T07 Rahul Sharma and P07-T09 Imran Shaikh', () => {
      const qualifiers = getQualifyingTechniciansForShift({
        plantId: 'P-07',
        requiredCerts: ['Mechanical', 'LOTO'],
        shift: 'B',
        technicians,
        certifications,
        referenceDate: TODAY_REFERENCE_DATE,
      });

      const techIds = qualifiers.map((q) => q.technician.id);
      expect(techIds).toContain('P07-T07');
      expect(techIds).toContain('P07-T09');

      // P07-T09 has LOTO expiring on 10 Nov 2026, which is an advisory warning, not a block
      const t09 = qualifiers.find((q) => q.technician.id === 'P07-T09');
      expect(t09).toBeDefined();
      expect(t09?.expiringSoonWarnings.length).toBeGreaterThan(0);
      expect(t09?.expiringSoonWarnings[0].name).toBe('LOTO');
      expect(t09?.expiringSoonWarnings[0].validUntil).toBe('2026-11-10');
    });

    it('strictly excludes P07-T04 because LOTO certification expired', () => {
      const qualifiers = getQualifyingTechniciansForShift({
        plantId: 'P-07',
        requiredCerts: ['Mechanical', 'LOTO'],
        shift: 'B',
        technicians,
        certifications,
        referenceDate: TODAY_REFERENCE_DATE,
      });

      const techIds = qualifiers.map((q) => q.technician.id);
      expect(techIds).not.toContain('P07-T04');

      // Direct certification evaluation confirms P07-T04 expired
      const t04Eval = evaluateTechnicianCerts('P07-T04', ['Mechanical', 'LOTO'], certifications, TODAY_REFERENCE_DATE);
      expect(t04Eval.hasAllCerts).toBe(false);
      expect(t04Eval.expiredCerts.some((e) => e.name === 'LOTO')).toBe(true);
    });
  });

  describe('Shift Mismatch Validation', () => {
    it('fails when assigned technician shift differs from window shift', () => {
      const rahul = technicians.find((t) => t.id === 'P07-T07')!;
      expect(rahul.shift).toBe('B');

      // Evaluated against Shift A window
      const assessment = assessTechnicianAssignment({
        technician: rahul,
        requiredCerts: ['Mechanical', 'LOTO'],
        windowShift: 'A',
        allCerts: certifications,
        referenceDate: TODAY_REFERENCE_DATE,
      });

      expect(assessment.qualified).toBe(false);
      expect(assessment.shiftMatch).toBe(false);
      expect(assessment.certsPass).toBe(true);
      expect(assessment.reason).toContain('Shift must match');
    });
  });

  describe('Cross-Shift Options when No Qualifiers on Proposed Shift', () => {
    it('names the reason in one line and provides cross-shift options for Electrical HT on Shift A', () => {
      const crossShift = getCrossShiftOptions({
        plantId: 'P-07',
        requiredCerts: ['Electrical HT', 'LOTO'],
        currentShift: 'A',
        technicians,
        certifications,
        referenceDate: TODAY_REFERENCE_DATE,
      });

      expect(crossShift.hasOnShiftQualifiers).toBe(false);
      expect(crossShift.onShiftReason).toBe(
        'No technician on Shift A holds valid Electrical HT & LOTO certifications.'
      );
      expect(crossShift.otherShiftQualifiers.length).toBeGreaterThan(0);

      // Suresh Nair (P07-T02, Shift C) holds Electrical HT + LOTO
      const shiftCGroup = crossShift.otherShiftQualifiers.find((g) => g.shift === 'C');
      expect(shiftCGroup).toBeDefined();
      expect(shiftCGroup?.technicians.some((t) => t.technician.id === 'P07-T02')).toBe(true);
    });
  });

  describe('Shadow Technician Rules', () => {
    it('selects only Junior or Trainee on the same shift as assigned technician', () => {
      // On Shift A: Ramesh Patil (Veteran) assigned -> Sneha Joshi (Junior) & Kavya Reddy (Trainee) eligible
      const shiftAShadows = getEligibleShadowTechnicians({
        plantId: 'P-07',
        assignedTechnicianShift: 'A',
        assignedTechnicianId: 'P07-T01',
        technicians,
      });

      expect(shiftAShadows.length).toBeGreaterThan(0);
      for (const shadow of shiftAShadows) {
        expect(shadow.shift).toBe('A');
        const role = shadow.role.toLowerCase();
        expect(role.includes('junior') || role.includes('trainee')).toBe(true);
        expect(shadow.id).not.toBe('P07-T01');
      }

      // On Shift B: Imran Shaikh (Technician) assigned -> Rahul Sharma (Junior) eligible
      const shiftBShadows = getEligibleShadowTechnicians({
        plantId: 'P-07',
        assignedTechnicianShift: 'B',
        assignedTechnicianId: 'P07-T09',
        technicians,
      });
      expect(shiftBShadows.some((s) => s.id === 'P07-T07')).toBe(true);
    });

    it('returns empty array if no junior or trainee is on that shift', () => {
      const mockTechs: Technician[] = [
        {
          id: 'TEST-01',
          name: 'Senior Tech',
          role: 'Senior Mechanical Technician',
          shift: 'A',
          plant_id: 'P-07',
          years_experience: 10,
          available: true,
        },
      ];

      const shadows = getEligibleShadowTechnicians({
        plantId: 'P-07',
        assignedTechnicianShift: 'A',
        technicians: mockTechs,
      });

      expect(shadows).toEqual([]);
    });
  });

  describe('Guardrail Integration with Live Rules', () => {
    it('passes guardrails when qualifying on-shift technician is assigned', () => {
      const mockAlert: any = {
        id: 'AL-TEST',
        plant_id: 'P-07',
        machine_id: 'P07-M03',
        failure_mode: 'bearing_wear',
        loto_required: true,
        assigned_technician: 'P07-T07',
        required_certifications: ['Mechanical', 'LOTO'],
        proposed_window: {
          line_id: 'L-01',
          date: '2026-10-19',
          shift: 'B',
          window_type: 'planned_shutdown',
          production_loss_units: 0,
        },
        spares_check: [],
        confidence: 0.95,
      };

      const outcome = runAllGuardrails(mockAlert, {
        machineCriticality: 'A',
        technicianShift: 'B',
        technicianCerts: certifications,
        liveSpares: [],
        userRole: 'Plant Head',
        referenceDate: TODAY_REFERENCE_DATE,
      });

      const certCheck = outcome.checks.find((c) => c.rule === 'certification_match');
      const shiftCheck = outcome.checks.find((c) => c.rule === 'shift_match');
      expect(certCheck?.pass).toBe(true);
      expect(shiftCheck?.pass).toBe(true);
    });

    it('fails certification_match guardrail when technician has expired LOTO', () => {
      const mockAlert: any = {
        id: 'AL-TEST',
        plant_id: 'P-07',
        machine_id: 'P07-M03',
        failure_mode: 'bearing_wear',
        loto_required: true,
        assigned_technician: 'P07-T04', // Expired LOTO
        required_certifications: ['Mechanical', 'LOTO'],
        proposed_window: {
          line_id: 'L-01',
          date: '2026-10-19',
          shift: 'B',
          window_type: 'planned_shutdown',
        },
        spares_check: [],
        confidence: 0.95,
      };

      const outcome = runAllGuardrails(mockAlert, {
        machineCriticality: 'A',
        technicianShift: 'B',
        technicianCerts: certifications,
        liveSpares: [],
        userRole: 'Plant Head',
        referenceDate: TODAY_REFERENCE_DATE,
      });

      const certCheck = outcome.checks.find((c) => c.rule === 'certification_match');
      expect(certCheck?.pass).toBe(false);
      expect(certCheck?.detail).toContain('expired');
    });

    it('fails shift_match guardrail when technician shift does not match window shift', () => {
      const mockAlert: any = {
        id: 'AL-TEST',
        plant_id: 'P-07',
        machine_id: 'P07-M03',
        failure_mode: 'bearing_wear',
        loto_required: true,
        assigned_technician: 'P07-T07', // Shift B
        required_certifications: ['Mechanical', 'LOTO'],
        proposed_window: {
          line_id: 'L-01',
          date: '2026-10-19',
          shift: 'A', // Mismatched shift
          window_type: 'planned_shutdown',
        },
        spares_check: [],
        confidence: 0.95,
      };

      const outcome = runAllGuardrails(mockAlert, {
        machineCriticality: 'A',
        technicianShift: 'B',
        technicianCerts: certifications,
        liveSpares: [],
        userRole: 'Plant Head',
        referenceDate: TODAY_REFERENCE_DATE,
      });

      const shiftCheck = outcome.checks.find((c) => c.rule === 'shift_match');
      expect(shiftCheck?.pass).toBe(false);
      expect(shiftCheck?.detail).toContain('does not match proposed window shift');
    });
  });

  describe('Shift canonical formatting', () => {
    it('formats shifts consistently', () => {
      expect(formatShiftFull('A')).toBe('Shift A (06:00 to 14:00)');
      expect(formatShiftFull('B')).toBe('Shift B (14:00 to 22:00)');
      expect(formatShiftFull('C')).toBe('Shift C (22:00 to 06:00)');
      expect(formatShiftShort('A')).toBe('Shift A');
      expect(formatShiftShort('B')).toBe('Shift B');
      expect(formatShiftShort('C')).toBe('Shift C');
    });
  });
});
