const mockGenerateContent = vi.fn().mockResolvedValue({
  text: JSON.stringify({
    difficulty: 'medium',
    sessions: [
      { title: 'Аналіз вимог та архітектура', durationMinutes: 90 },
      { title: 'Розробка REST API', durationMinutes: 120 },
      { title: 'Тестування та багфікс', durationMinutes: 60 }
    ]
  })
});

const mockGoogleGenAI = {
  GoogleGenAI: class GoogleGenAI {
    constructor({ apiKey }) {
      this.apiKey = apiKey;
      this.models = {
        generateContent: mockGenerateContent
      };
    }
  }
};

module.exports = {
  mockGoogleGenAI,
  mockGenerateContent
};
