/**
 * Canonical Shift Definitions for Ferrow Foresight
 * 
 * Strict format rules:
 * - Full format: "Shift A (06:00 to 14:00)", "Shift B (14:00 to 22:00)", "Shift C (22:00 to 06:00)"
 * - Short format: "Shift A", "Shift B", "Shift C" (or "Shift A/B/C")
 * - Never "Shift 2", "Shift Shift", or raw shift numbers.
 */

export type ShiftId = 'A' | 'B' | 'C';

export interface ShiftDefinition {
  id: ShiftId;
  name: string;
  hours: string;
  fullLabel: string;
  shortLabel: string;
}

export const SHIFTS: Record<ShiftId, ShiftDefinition> = {
  A: {
    id: 'A',
    name: 'Shift A',
    hours: '06:00 to 14:00',
    fullLabel: 'Shift A (06:00 to 14:00)',
    shortLabel: 'Shift A',
  },
  B: {
    id: 'B',
    name: 'Shift B',
    hours: '14:00 to 22:00',
    fullLabel: 'Shift B (14:00 to 22:00)',
    shortLabel: 'Shift B',
  },
  C: {
    id: 'C',
    name: 'Shift C',
    hours: '22:00 to 06:00',
    fullLabel: 'Shift C (22:00 to 06:00)',
    shortLabel: 'Shift C',
  },
};

/**
 * Normalises any shift representation (e.g. '1', '2', 'Shift B', 'b', 'Shift 2') to 'A' | 'B' | 'C'.
 */
export function normalizeShiftId(raw?: string | null): ShiftId {
  if (!raw) return 'A';
  const clean = raw.trim().toUpperCase();
  if (clean.includes('C') || clean === '3' || clean === 'SHIFT 3') return 'C';
  if (clean.includes('B') || clean === '2' || clean === 'SHIFT 2') return 'B';
  if (clean.includes('A') || clean === '1' || clean === 'SHIFT 1') return 'A';
  return 'A';
}

/**
 * Returns full format: "Shift A (06:00 to 14:00)"
 */
export function formatShiftFull(raw?: string | null): string {
  const id = normalizeShiftId(raw);
  return SHIFTS[id].fullLabel;
}

/**
 * Returns short format: "Shift A"
 * Prevents "Shift Shift" duplication even if input already includes "Shift".
 */
export function formatShiftShort(raw?: string | null): string {
  const id = normalizeShiftId(raw);
  return SHIFTS[id].shortLabel;
}

/**
 * Returns only the timing: "06:00 to 14:00"
 */
export function formatShiftHours(raw?: string | null): string {
  const id = normalizeShiftId(raw);
  return SHIFTS[id].hours;
}
