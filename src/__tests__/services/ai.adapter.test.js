/**
 * AI Adapter Service Tests
 *
 * Uses vi.mock() to intercept the @google/genai module at the Vitest
 * level — no test infrastructure imported into production code.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock @google/genai BEFORE importing the module under test
const mockGenerateContent = vi.fn().mockResolvedValue({
  text: JSON.stringify({
    difficulty: 'medium',
    sessions: [
      { title: 'Аналіз вимог та архітектура', durationMinutes: 90 },
      { title: 'Розробка REST API', durationMinutes: 120 },
      { title: 'Тестування та багфікс', durationMinutes: 60 },
    ],
  }),
});

vi.mock('@google/genai', () => ({
  GoogleGenAI: class GoogleGenAI {
    constructor({ apiKey }) {
      this.apiKey = apiKey;
      this.models = { generateContent: mockGenerateContent };
    }
  },
}));

import aiAdapter from '../../services/ai/ai.adapter.js';

describe('AI Adapter Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure a real-looking API key so fallback path isn't triggered
    process.env.GEMINI_API_KEY = 'AIzaSyRealLookingKey';
  });

  it('decomposeProject - should correctly format prompt and call Gemini model returning difficulty and sessions', async () => {
    const project = {
      courseName: 'Розподілені системи',
      title: 'Лабораторна 3: gRPC',
      description: 'Створити клієнт-серверний додаток з використанням gRPC та protobuf',
    };
    const persona = { maxHoursPerDay: 4 };

    const result = await aiAdapter.decomposeProject(project, persona);

    // Verify correct structure returned
    expect(result.difficulty).toBe('medium');
    expect(result.sessions).toHaveLength(3);
    expect(result.sessions[0].title).toBe('Аналіз вимог та архітектура');
    expect(result.sessions[0].durationMinutes).toBe(90);

    // Verify Gemini mock spy was called with correct args
    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: 'gemini-2.0-flash',
      contents: expect.stringContaining('gRPC'),
      config: { responseMimeType: 'application/json' },
    });
  });
});
