import { describe, it, expect } from 'vitest';
import { getTechniciansSync, getCertificationsSync, getTechnicianSkillsSync } from '@/lib/data/technicians';
import { getKnowledgeLibrarySync } from '@/lib/data/knowledge';
import { getLearningCards, getSuggestedPairings, knowledgeService } from '@/lib/knowledgeService';

describe('People & Skills Development (Training Coordinator Home)', () => {
  const TODAY = new Date('2026-10-18');

  it('evaluates technician skill matrix and identifies gaps', () => {
    const techs = getTechniciansSync('P-07');
    expect(techs.length).toBe(12);

    const skills = getTechnicianSkillsSync();
    expect(skills.length).toBeGreaterThan(0);

    // Verify level scale 1-4 and target_level
    const p07Skills = skills.filter((s) => s.technician_id.startsWith('P07'));
    expect(p07Skills.length).toBeGreaterThan(0);

    for (const s of p07Skills) {
      expect(s.level).toBeGreaterThanOrEqual(1);
      expect(s.level).toBeLessThanOrEqual(4);
      expect(s.target_level).toBeGreaterThanOrEqual(1);
      expect(s.target_level).toBeLessThanOrEqual(4);
    }

    const gaps = p07Skills.filter((s) => s.level < s.target_level);
    expect(gaps.length).toBeGreaterThan(0);
  });

  it('accurately identifies expired and expiring certifications for P07-T04 and P07-T09', () => {
    const certs = getCertificationsSync();
    const p07Certs = certs.filter((c) => c.technician_id.startsWith('P07'));

    // Check P07-T04 LOTO
    const t04Loto = p07Certs.find((c) => c.technician_id === 'P07-T04' && c.certification === 'LOTO');
    expect(t04Loto).toBeDefined();
    expect(t04Loto?.valid_until).toBe('2026-09-30');

    const t04Expiry = new Date(t04Loto!.valid_until);
    const t04Days = Math.ceil((t04Expiry.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
    expect(t04Days).toBeLessThan(0); // Expired!

    // Check P07-T09 LOTO
    const t09Loto = p07Certs.find((c) => c.technician_id === 'P07-T09' && c.certification === 'LOTO');
    expect(t09Loto).toBeDefined();
    expect(t09Loto?.valid_until).toBe('2026-11-10');

    const t09Expiry = new Date(t09Loto!.valid_until);
    const t09Days = Math.ceil((t09Expiry.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
    expect(t09Days).toBeGreaterThan(0);
    expect(t09Days).toBeLessThanOrEqual(30); // Expiring within 30 days!
  });

  it('filters knowledge library entries and enforces sensory fields', () => {
    const all = getKnowledgeLibrarySync();
    expect(all.length).toBeGreaterThanOrEqual(10);

    const first = all[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('machine_type');
    expect(first).toHaveProperty('failure_mode');
    expect(first).toHaveProperty('sound');
    expect(first).toHaveProperty('smell');
    expect(first).toHaveProperty('feel_visual');
    expect(first).toHaveProperty('captured_from');
    expect(first).toHaveProperty('verified');

    const compressors = getKnowledgeLibrarySync('compressor');
    expect(compressors.length).toBeGreaterThan(0);
    for (const c of compressors) {
      expect(c.machine_type.toLowerCase()).toBe('compressor');
    }
  });

  it('suggests veteran-junior pairings on same shift with shared assignments', async () => {
    const pairings = await getSuggestedPairings('P-07');
    expect(pairings.length).toBeGreaterThanOrEqual(3);

    for (const pair of pairings) {
      expect(pair.veteran_id).toBeDefined();
      expect(pair.junior_id).toBeDefined();
      expect(pair.shift).toBeDefined();
      expect(pair.upcoming_job).toBeDefined();
      expect(pair.reason).toBeDefined();
    }
  });

  it('generates learning cards matching knowledge agent schema with 3 key points', async () => {
    const cards = await getLearningCards();
    expect(cards.length).toBeGreaterThan(0);

    for (const card of cards) {
      expect(card.title).toBeDefined();
      expect(['Junior', 'Trainee']).toContain(card.for_role);
      expect(card.key_points.length).toBe(3);
      expect(card.quick_check_question).toBeDefined();
      expect(card.answer).toBeDefined();
    }

    // Call knowledgeService generator
    const agentResult = await knowledgeService({
      work_order_id: 'WO-2201',
      machine_type: 'hydraulic',
      failure_mode: 'hydraulic_leak',
      symptoms: ['Sound: pump whine', 'Smell: hot oil'],
      findings: 'Cylinder rod seal extrusion',
    });

    expect(agentResult.decision).toBe('new');
    expect(agentResult.knowledge_entry.verified).toBe(false);
    expect(agentResult.learning_card.key_points.length).toBe(3);
    expect(agentResult.suggested_pairing.veteran_id).toBeDefined();
    expect(agentResult.suggested_pairing.junior_id).toBeDefined();
  });
});
