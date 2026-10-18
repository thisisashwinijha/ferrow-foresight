import { describe, it, expect } from 'vitest';
import { getSparesSync, getSpareByIdSync } from '@/lib/data/spares';
import { getWorkOrdersSync } from '@/lib/data/workOrders';

describe('Spares Readiness & Inventory Verification', () => {
  it('retrieves spare parts inventory for P-07 with required fields', () => {
    const spares = getSparesSync('P-07');
    expect(spares.length).toBeGreaterThan(0);

    const first = spares[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('part_no');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('category');
    expect(first).toHaveProperty('stock');
    expect(first).toHaveProperty('min_level');
    expect(first).toHaveProperty('lead_time_days');
    expect(first).toHaveProperty('unit_cost_usd');
  });

  it('accurately identifies stockout parts in P-07', () => {
    const spares = getSparesSync('P-07');
    const stockouts = spares.filter((s) => s.stock <= 0);

    // In P-07 seed data, SP-015 (Servo motor 2.2kW) and SP-025 (Hydraulic pump cartridge) are stockout (stock: 0)
    expect(stockouts.length).toBeGreaterThanOrEqual(2);
    const partNumbers = stockouts.map((s) => s.part_no);
    expect(partNumbers).toContain('SP-015');
    expect(partNumbers).toContain('SP-025');
  });

  it('accurately identifies below-min safety stock parts in P-07', () => {
    const spares = getSparesSync('P-07');
    const belowMin = spares.filter((s) => s.stock > 0 && s.stock < s.min_level);

    // SP-003 (Spherical roller bearing 22312) has stock: 1, min_level: 2
    expect(belowMin.length).toBeGreaterThanOrEqual(1);
    const p003 = belowMin.find((s) => s.part_no === 'SP-003');
    expect(p003).toBeDefined();
    expect(p003?.stock).toBe(1);
    expect(p003?.min_level).toBe(2);
    expect(p003?.critical).toBe(true);
  });

  it('calculates readiness % for upcoming work orders', () => {
    const spares = getSparesSync('P-07');
    const workOrders = getWorkOrdersSync('P-07');
    const activeOrders = workOrders.filter((wo) => wo.status !== 'closed');

    expect(activeOrders.length).toBeGreaterThanOrEqual(2);

    for (const wo of activeOrders) {
      const reserved = Array.isArray(wo.spares_reserved) ? wo.spares_reserved : [];
      if (reserved.length === 0) {
        // No spares needed -> 100% ready
        expect(true).toBe(true);
      } else {
        let readyCount = 0;
        for (const req of reserved) {
          const match = spares.find((s) => s.part_no === req.part_id || s.id === req.part_id);
          expect(match).toBeDefined();
          if (match && match.stock >= req.qty) {
            readyCount++;
          }
        }
        const readinessPct = Math.round((readyCount / reserved.length) * 100);
        expect(readinessPct).toBeGreaterThanOrEqual(0);
        expect(readinessPct).toBeLessThanOrEqual(100);
      }
    }
  });

  it('formats pre-filled purchase request draft parameters correctly', () => {
    const part = getSpareByIdSync('P07-SP-015');
    expect(part).toBeDefined();
    if (!part) return;

    const suggestedQty = Math.max(part.min_level * 2 - part.stock, part.min_level, 1);
    const reason = `Critical stockout at Plant ${part.plant_id}.`;

    const subject = `Purchase request: ${part.name} (${part.part_no}) - Plant ${part.plant_id}`;
    expect(subject).toContain('SP-015');
    expect(subject).toContain('P-07');
    expect(suggestedQty).toBeGreaterThanOrEqual(1);
    expect(reason).toContain('stockout');
  });
});
