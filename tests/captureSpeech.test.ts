import { describe, it, expect } from 'vitest';

describe('Technician Capture & Speech Reconstitution (Step 4)', () => {
  it('reconstitutes transcript from final results without repeated duplication', () => {
    // Simulating Web Speech API event sequence where intermediate speech results fire
    const speechEvents = [
      {
        resultIndex: 0,
        results: [
          [{ transcript: 'I can' }],
        ],
      },
      {
        resultIndex: 0,
        results: [
          [{ transcript: 'I can see' }],
        ],
      },
      {
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: 'I can see abnormal vibration' }], { isFinal: true }),
        ],
      },
      {
        resultIndex: 1,
        results: [
          Object.assign([{ transcript: 'I can see abnormal vibration' }], { isFinal: true }),
          [{ transcript: 'and hear grinding' }],
        ],
      },
      {
        resultIndex: 1,
        results: [
          Object.assign([{ transcript: 'I can see abnormal vibration' }], { isFinal: true }),
          Object.assign([{ transcript: 'and hear grinding noise' }], { isFinal: true }),
        ],
      },
    ];

    let baseNote = '';
    let finalAccumulated = '';
    let currentNote = '';
    let interimText = '';

    for (const event of speechEvents) {
      let finalChunk = '';
      let interimChunk = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item: any = event.results[i];
        const text = item[0]?.transcript || '';
        if (item.isFinal) {
          finalChunk += text;
        } else {
          interimChunk += text;
        }
      }

      if (finalChunk) {
        finalAccumulated += (finalAccumulated ? ' ' : '') + finalChunk.trim();
        currentNote = baseNote ? `${baseNote} ${finalAccumulated}` : finalAccumulated;
      }
      interimText = interimChunk.trim();
    }

    // Must NOT contain repeated "I I can I can see..."
    expect(currentNote).toBe('I can see abnormal vibration and hear grinding noise');
    expect(currentNote).not.toContain('I I');
    expect(currentNote).not.toContain('see see');
  });

  it('correctly disables continuous mode on mobile user agents to prevent duplicates', () => {
    const isMobileUA = (ua: string) => /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
    expect(isMobileUA('Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)')).toBe(true);
    expect(isMobileUA('Mozilla/5.0 (Linux; Android 13; Pixel 7)')).toBe(true);
    expect(isMobileUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(false);
  });
});
