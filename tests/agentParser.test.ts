import { describe, it, expect } from 'vitest';
import { parseAgentResponse, stripCodeFences, extractJsonString } from '../lib/agents/parser';

describe('Agent Parser (Step 12 Tests)', () => {
  describe('stripCodeFences and extractJsonString', () => {
    it('strips ```json ... ``` fences correctly', () => {
      const raw = '```json\n{"summary": "Test alert"}\n```';
      const stripped = stripCodeFences(raw);
      expect(stripped).toBe('{"summary": "Test alert"}');
    });

    it('strips generic ``` ... ``` fences correctly', () => {
      const raw = '```\n{"summary": "No lang"}\n```';
      const stripped = stripCodeFences(raw);
      expect(stripped).toBe('{"summary": "No lang"}');
    });

    it('extracts embedded JSON object from surrounding commentary', () => {
      const raw = 'Here is the response:\n```json\n{"key": "value"}\n```\nHope that helps!';
      const extracted = extractJsonString(raw);
      expect(extracted).toBe('{"key": "value"}');
    });

    it('extracts JSON array from text', () => {
      const raw = 'Leading text [1, 2, 3] trailing text';
      const extracted = extractJsonString(raw);
      expect(extracted).toBe('[1, 2, 3]');
    });
  });

  describe('Make "Accepted" check', () => {
    it('fails when Make returns plain "Accepted" string', () => {
      const result = parseAgentResponse('triage', 'Accepted');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Accepted');
      expect(result.schema_valid).toBe(false);
    });

    it('fails when Make returns whitespace padded "Accepted"', () => {
      const result = parseAgentResponse('triage', '   Accepted \n');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Accepted');
    });
  });

  describe('Separator @@@TRIAGE@@@ handling', () => {
    it('parses two JSON blocks separated by @@@TRIAGE@@@', () => {
      const interpreterPart = JSON.stringify({
        failure_mode: 'bearing_wear',
        severity: 'high',
        specific: true,
        sensory_cues: ['metallic grinding'],
        matched_knowledge_ids: ['KB-001'],
        evidence_strength: 'strong',
        rationale: 'Sound and vibe match bearing degradation',
      });

      const plannerPart = JSON.stringify({
        machine_id: 'P07-M05',
        failure_mode: 'bearing_wear',
        confidence: 0.88,
        urgency: 'P2',
        alert: true,
        insufficient_evidence: false,
        evidence: [
          {
            id: 'EV-1',
            type: 'audio',
            text: 'Metallic grinding from drive end',
          },
        ],
        reasoning: 'Vibration pattern indicates bearing degradation',
        action_type: 'inspect',
        recommended_action: 'Inspect drive end bearing',
        loto_required: true,
        required_certifications: ['vibration_analyst'],
        assigned_technician: 'EMP-01',
      });

      const raw = `${interpreterPart}\n@@@TRIAGE@@@\n${plannerPart}`;
      const result = parseAgentResponse('triage', raw);

      expect(result.success).toBe(true);
      expect(result.schema_valid).toBe(true);
      expect(result.interpreter_data).toBeDefined();
      expect(result.interpreter_data.failure_mode).toBe('bearing_wear');
      expect(result.data.alert).toBe(true);
      expect(result.data.urgency).toBe('P2');
      expect(result.data.loto_required).toBe(true);
    });

    it('works when wrapped in markdown code fences across separator', () => {
      const interpreterPart = `\`\`\`json
{
  "failure_mode": "none",
  "evidence_strength": "none",
  "rationale": "No anomaly detected"
}
\`\`\``;

      const plannerPart = `\`\`\`json
{
  "machine_id": "P01-M01",
  "failure_mode": "none",
  "confidence": 0.95,
  "urgency": "none",
  "alert": false,
  "insufficient_evidence": true,
  "evidence": [
    {
      "id: "EV-0",
      "type": "operator_log",
      "text": "Routine check - normal"
    }
  ],
  "reasoning": "Readings are within baseline tolerance",
  "action_type": "monitor",
  "recommended_action": "No intervention required",
  "loto_required": false,
  "required_certifications": [],
  "assigned_technician": null
}
\`\`\``;

      // Clean invalid internal quote in EV-0 id
      const fixedPlanner = plannerPart.replace('"id: "', '"id": "');
      const raw = `${interpreterPart}\n@@@TRIAGE@@@\n${fixedPlanner}`;
      const result = parseAgentResponse('triage', raw);
      expect(result.success).toBe(true);
      expect(result.data.alert).toBe(false);
    });
  });

  describe('Malformed JSON handling', () => {
    it('gracefully fails on invalid JSON syntax', () => {
      const malformed = '{"alert": true, "urgency": "P1", invalid_json}';
      const result = parseAgentResponse('triage', malformed);
      expect(result.success).toBe(false);
      expect(result.schema_valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('gracefully fails on empty string or null', () => {
      const resultEmpty = parseAgentResponse('triage', '');
      expect(resultEmpty.success).toBe(false);
      expect(resultEmpty.schema_valid).toBe(false);

      const resultNull = parseAgentResponse('triage', null as any);
      expect(resultNull.success).toBe(false);
    });
  });

  describe('Schema validation for other agents', () => {
    it('validates pm_optimiser output', () => {
      const pmJson = JSON.stringify({
        plant_id: 'P01',
        summary: {
          tasks_reviewed: 1,
          keep: 0,
          defer: 0,
          pull_forward: 1,
        },
        decisions: [
          {
            pm_task_id: 'PM-101',
            machine_id: 'P01-M01',
            decision: 'pull_forward',
            current_due_date: '2026-10-30',
            new_due_date: '2026-10-25',
            confidence: 0.9,
            reason: 'Combine with shutdown',
          },
        ],
      });
      const result = parseAgentResponse('pm_optimiser', pmJson);
      expect(result.success).toBe(true);
      expect(result.schema_valid).toBe(true);
      expect(result.data.decisions).toHaveLength(1);
    });

    it('validates copilot output', () => {
      const copilotJson = JSON.stringify({
        answer: 'You should isolate the hydraulic valve first.',
        cited_ids: ['SOP-HYD-04'],
        confidence: 0.95,
        answer_found_in_context: true,
      });
      const result = parseAgentResponse('copilot', copilotJson);
      expect(result.success).toBe(true);
      expect(result.schema_valid).toBe(true);
      expect(result.data.answer).toContain('hydraulic valve');
    });

    it('validates knowledge output', () => {
      const knowledgeJson = JSON.stringify({
        decision: 'new',
        knowledge_entry: {
          machine_type: 'Pump',
          failure_mode: 'bearing_wear',
          root_cause: 'Fatigue failure due to inadequate lubrication',
          prevention: 'Increase greasing interval to bi-weekly',
          early_warning_signs: ['high pitch noise'],
        },
        learning_card: {
          title: 'Bearing Lubrication Check',
          key_points: ['Check grease level every 50 hours'],
          quick_check_question: 'What is the warning sign?',
          answer: 'High pitch noise',
        },
        suggested_pairing: {
          veteran_id: 'EMP-VET',
          junior_id: 'EMP-JUN',
          reason: 'Hands-on greasing demonstration',
        },
      });
      const result = parseAgentResponse('knowledge', knowledgeJson);
      expect(result.success).toBe(true);
      expect(result.schema_valid).toBe(true);
      expect(result.data.knowledge_entry.root_cause).toContain('Fatigue failure');
    });
  });
});
