const { mockGenerateContent } = require('../mocks/gemini.mock');
const aiAdapter = require('../../services/ai/ai.adapter');

describe('AI Adapter Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('decomposeProject - should correctly format prompt and call Gemini model returning difficulty and sessions', async () => {
    const project = {
      courseName: 'Розподілені системи',
      title: 'Лабораторна 3: gRPC',
      description: 'Створити клієнт-серверний додаток з використанням gRPC та protobuf'
    };

    const persona = {
      maxHoursPerDay: 4
    };

    const result = await aiAdapter.decomposeProject(project, persona);

    // Verify correct structure returned
    expect(result.difficulty).toBe('medium');
    expect(result.sessions).toHaveLength(3);
    expect(result.sessions[0].title).toBe('Аналіз вимог та архітектура');
    expect(result.sessions[0].durationMinutes).toBe(90);

    // Verify Gemini mock spy
    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash',
      contents: expect.stringContaining('gRPC'),
      config: {
        responseMimeType: 'application/json'
      }
    });
  });
});
