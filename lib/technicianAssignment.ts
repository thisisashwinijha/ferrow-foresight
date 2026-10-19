import { Technician, Certification } from './types';
import { normalizeShiftId, formatShiftShort, formatShiftFull, ShiftId } from './shifts';
import { getSeedData } from './data/db';

export const TODAY_REFERENCE_DATE = '2026-10-18';

/**
 * Determine required certifications strictly based on prompts/triage_planner.md Rule 7:
 * - Mechanical: bearing_wear, belt_wear, misalignment, lubrication_failure, seal_failure
 * - Hydraulics: hydraulic_leak
 * - Pneumatics: pneumatic_leak
 * - Electrical HT: MCC electrical faults (machine P07-M30 or note citing MCC/HT)
 * - Electrical LV: standard electrical faults, motor overheating
 * - Instrumentation: sensor faults
 * - Plus "LOTO" when loto_required is true
 * 
 * Never invent requirements such as skill levels.
 */
export function getRequiredCertificationsForAlert(params: {
  failureMode?: string | null;
  lotoRequired?: boolean;
  machineId?: string | null;
  note?: string | null;
  existingRequiredCerts?: string[] | null;
}): string[] {
  const { failureMode, lotoRequired, machineId, note, existingRequiredCerts } = params;
  const certs = new Set<string>();

  // If already explicitly provided from strict taxonomy, start with those
  if (Array.isArray(existingRequiredCerts)) {
    for (const c of existingRequiredCerts) {
      if (c && typeof c === 'string') {
        const clean = c.trim();
        // Disallow invented levels like "Level II"
        if (/vibration analysis level/i.test(clean)) {
          certs.add('Mechanical');
        } else {
          certs.add(clean);
        }
      }
    }
  }

  const mode = (failureMode || '').toLowerCase().trim();
  const text = `${note || ''} ${machineId || ''}`.toLowerCase();

  if (
    mode === 'bearing_wear' ||
    mode === 'belt_wear' ||
    mode === 'misalignment' ||
    mode === 'lubrication_failure' ||
    mode === 'seal_failure'
  ) {
    certs.add('Mechanical');
  } else if (mode === 'hydraulic_leak') {
    certs.add('Hydraulics');
  } else if (mode === 'pneumatic_leak') {
    certs.add('Pneumatics');
  } else if (mode === 'electrical_fault') {
    // MCC or HT electrical work requires Electrical HT
    if (machineId === 'P07-M30' || text.includes('mcc') || text.includes('ht') || text.includes('high tension') || text.includes('burning smell')) {
      certs.add('Electrical HT');
    } else {
      certs.add('Electrical LV');
    }
  } else if (mode === 'motor_overheating') {
    certs.add('Electrical LV');
  } else if (mode === 'sensor_fault') {
    certs.add('Instrumentation');
  }

  // LOTO certification rule: required whenever LOTO is needed
  if (lotoRequired) {
    certs.add('LOTO');
  }

  return Array.from(certs);
}

export interface CertCheckResult {
  hasAllCerts: boolean;
  missingCerts: string[];
  expiredCerts: Array<{ name: string; validUntil: string }>;
  expiringSoonCerts: Array<{ name: string; validUntil: string }>;
}

/**
 * Check if a technician holds all required certifications and whether any are expired.
 */
export function evaluateTechnicianCerts(
  technicianId: string,
  requiredCerts: string[],
  certsList: Certification[],
  referenceDate: string = TODAY_REFERENCE_DATE
): CertCheckResult {
  const techCerts = certsList.filter((c) => c.technician_id === technicianId);
  const certMap = new Map<string, string>();
  for (const c of techCerts) {
    certMap.set(c.certification.toLowerCase(), c.valid_until);
  }

  const missingCerts: string[] = [];
  const expiredCerts: Array<{ name: string; validUntil: string }> = [];
  const expiringSoonCerts: Array<{ name: string; validUntil: string }> = [];

  const refTime = new Date(referenceDate).getTime();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  for (const req of requiredCerts) {
    const validUntilStr = certMap.get(req.toLowerCase());
    if (!validUntilStr) {
      missingCerts.push(req);
    } else {
      const validUntilTime = new Date(validUntilStr).getTime();
      if (validUntilTime < refTime) {
        // Expired
        expiredCerts.push({ name: req, validUntil: validUntilStr });
      } else if (validUntilTime <= refTime + thirtyDaysMs) {
        // Valid today, but expiring soon (warning, not a block)
        expiringSoonCerts.push({ name: req, validUntil: validUntilStr });
      }
    }
  }

  const hasAllCerts = missingCerts.length === 0 && expiredCerts.length === 0;

  return {
    hasAllCerts,
    missingCerts,
    expiredCerts,
    expiringSoonCerts,
  };
}

export interface QualifiedTechnicianResult {
  technician: Technician;
  certs: Certification[];
  expiringSoonWarnings: Array<{ name: string; validUntil: string }>;
  shiftMatch: boolean;
  isFullyQualifiedOnShift: boolean;
}

/**
 * Full qualification assessment for an assigned technician.
 */
export function assessTechnicianAssignment(params: {
  technician: Technician;
  requiredCerts: string[];
  windowShift?: string | null;
  allCerts?: Certification[];
  referenceDate?: string;
}): {
  qualified: boolean;
  shiftMatch: boolean;
  certsPass: boolean;
  reason?: string;
  expiringSoonWarnings: Array<{ name: string; validUntil: string }>;
} {
  const { technician, requiredCerts, windowShift, allCerts, referenceDate = TODAY_REFERENCE_DATE } = params;

  const certs = allCerts || (getSeedData().certifications as Certification[]) || [];
  const certEval = evaluateTechnicianCerts(technician.id, requiredCerts, certs, referenceDate);

  const techShift = normalizeShiftId(technician.shift);
  const targetShift = normalizeShiftId(windowShift);
  const shiftMatch = techShift === targetShift;

  if (!certEval.hasAllCerts) {
    const issues: string[] = [];
    if (certEval.missingCerts.length > 0) {
      issues.push(`missing ${certEval.missingCerts.join(', ')}`);
    }
    if (certEval.expiredCerts.length > 0) {
      issues.push(
        `expired ${certEval.expiredCerts.map((e) => `${e.name} on ${e.validUntil}`).join(', ')}`
      );
    }
    return {
      qualified: false,
      shiftMatch,
      certsPass: false,
      reason: `${technician.name} (${technician.id}) fails certification check: ${issues.join('; ')}`,
      expiringSoonWarnings: certEval.expiringSoonCerts,
    };
  }

  if (!shiftMatch) {
    return {
      qualified: false,
      shiftMatch: false,
      certsPass: true,
      reason: `${technician.name} is on ${formatShiftShort(techShift)}, but maintenance window is ${formatShiftShort(targetShift)}. Shift must match.`,
      expiringSoonWarnings: certEval.expiringSoonCerts,
    };
  }

  return {
    qualified: true,
    shiftMatch: true,
    certsPass: true,
    expiringSoonWarnings: certEval.expiringSoonCerts,
  };
}

/**
 * Get all qualifying technicians for a given plant, required certifications, and window shift.
 * Lists EVERY qualifying technician for that shift.
 * Shows expiring-soon certifications as warnings, not blocks.
 * Expired certifications are strictly excluded.
 */
export function getQualifyingTechniciansForShift(params: {
  plantId: string;
  requiredCerts: string[];
  shift: string;
  technicians?: Technician[];
  certifications?: Certification[];
  referenceDate?: string;
}): QualifiedTechnicianResult[] {
  const { plantId, requiredCerts, shift, technicians, certifications, referenceDate = TODAY_REFERENCE_DATE } = params;

  const seed = getSeedData();
  const techList: Technician[] = technicians || (seed.technicians as Technician[]) || [];
  const certsList: Certification[] = certifications || (seed.certifications as Certification[]) || [];

  const targetShift = normalizeShiftId(shift);

  const plantTechs = techList.filter(
    (t) => (!plantId || plantId === 'all' || t.plant_id === plantId) && normalizeShiftId(t.shift) === targetShift
  );

  const qualifying: QualifiedTechnicianResult[] = [];

  for (const tech of plantTechs) {
    const certEval = evaluateTechnicianCerts(tech.id, requiredCerts, certsList, referenceDate);
    if (certEval.hasAllCerts) {
      const techCerts = certsList.filter((c) => c.technician_id === tech.id);
      qualifying.push({
        technician: tech,
        certs: techCerts,
        expiringSoonWarnings: certEval.expiringSoonCerts,
        shiftMatch: true,
        isFullyQualifiedOnShift: true,
      });
    }
  }

  return qualifying;
}

/**
 * Cross-shift inspection when no technicians qualify on the proposed shift.
 * Names the reason in one line and returns options:
 * 1) Pick another window
 * 2) Assign from another shift (which moves the window to that shift)
 */
export function getCrossShiftOptions(params: {
  plantId: string;
  requiredCerts: string[];
  currentShift: string;
  technicians?: Technician[];
  certifications?: Certification[];
  referenceDate?: string;
}): {
  hasOnShiftQualifiers: boolean;
  onShiftReason: string;
  otherShiftQualifiers: Array<{
    shift: ShiftId;
    shiftLabel: string;
    technicians: QualifiedTechnicianResult[];
  }>;
} {
  const { plantId, requiredCerts, currentShift, technicians, certifications, referenceDate = TODAY_REFERENCE_DATE } = params;

  const targetShift = normalizeShiftId(currentShift);
  const onShift = getQualifyingTechniciansForShift({
    plantId,
    requiredCerts,
    shift: targetShift,
    technicians,
    certifications,
    referenceDate,
  });

  const certLabels = requiredCerts.length > 0 ? requiredCerts.join(' & ') : 'required';
  const onShiftReason = `No technician on ${formatShiftShort(targetShift)} holds valid ${certLabels} certifications.`;

  const allShifts: ShiftId[] = ['A', 'B', 'C'];
  const otherShifts = allShifts.filter((s) => s !== targetShift);

  const otherShiftQualifiers = otherShifts
    .map((s) => {
      const techs = getQualifyingTechniciansForShift({
        plantId,
        requiredCerts,
        shift: s,
        technicians,
        certifications,
        referenceDate,
      });
      return {
        shift: s,
        shiftLabel: formatShiftFull(s),
        technicians: techs,
      };
    })
    .filter((g) => g.technicians.length > 0);

  return {
    hasOnShiftQualifiers: onShift.length > 0,
    onShiftReason,
    otherShiftQualifiers,
  };
}

/**
 * Shadow technician rules:
 * Only a Junior or Trainee on the same shift as the assigned technician; otherwise none (null).
 */
export function getEligibleShadowTechnicians(params: {
  plantId: string;
  assignedTechnicianShift: string;
  assignedTechnicianId?: string | null;
  technicians?: Technician[];
}): Technician[] {
  const { plantId, assignedTechnicianShift, assignedTechnicianId, technicians } = params;

  const seed = getSeedData();
  const techList: Technician[] = technicians || (seed.technicians as Technician[]) || [];
  const targetShift = normalizeShiftId(assignedTechnicianShift);

  return techList.filter((t) => {
    if (plantId && plantId !== 'all' && t.plant_id !== plantId) return false;
    if (normalizeShiftId(t.shift) !== targetShift) return false;
    if (assignedTechnicianId && t.id === assignedTechnicianId) return false;
    const roleLower = (t.role || '').toLowerCase();
    return roleLower.includes('junior') || roleLower.includes('trainee');
  });
}

/**
 * Normalise shadow technician:
 * Only a Junior or Trainee on the same shift as the assigned technician.
 * If alert has an assigned technician and shadow technician is specified:
 * - If current shadow technician is already an eligible Junior or Trainee on the assigned technician's shift, keep it.
 * - Otherwise replace with an eligible Junior or Trainee on that shift (e.g. AL-1001: Ramesh Shift A -> Sneha Joshi P07-T08).
 * - If no eligible shadow exists or assigned technician is already Junior/Trainee, set to null.
 */
export function normalizeAlertShadowTechnician<
  T extends {
    assigned_technician?: string | null;
    shadow_technician?: string | null;
    plant_id?: string;
    machine_id?: string;
  }
>(alert: T): T {
  if (!alert) return alert;

  if (!alert.assigned_technician) {
    if (alert.shadow_technician) {
      return { ...alert, shadow_technician: null };
    }
    return alert;
  }

  const seed = getSeedData();
  const techList: Technician[] = (seed.technicians as Technician[]) || [];
  const assignedTech = techList.find((t) => t.id === alert.assigned_technician);

  if (!assignedTech) return alert;

  const roleLower = (assignedTech.role || '').toLowerCase();
  if (roleLower.includes('junior') || roleLower.includes('trainee')) {
    if (alert.shadow_technician) {
      return { ...alert, shadow_technician: null };
    }
    return alert;
  }

  const plantId = alert.plant_id || assignedTech.plant_id || 'P-07';
  const eligibleShadows = getEligibleShadowTechnicians({
    plantId,
    assignedTechnicianShift: assignedTech.shift,
    assignedTechnicianId: alert.assigned_technician,
    technicians: techList,
  });

  if (eligibleShadows.length === 0) {
    if (alert.shadow_technician) {
      return { ...alert, shadow_technician: null };
    }
    return alert;
  }

  // If already set and eligible, keep it
  if (alert.shadow_technician && eligibleShadows.some((s) => s.id === alert.shadow_technician)) {
    return alert;
  }

  // If shadow_technician is set, assign the first eligible shadow on the same shift
  if (alert.shadow_technician) {
    return {
      ...alert,
      shadow_technician: eligibleShadows[0].id,
    };
  }

  return alert;
}
