const { GoogleGenAI } = process.env.NODE_ENV === 'test'
  ? require('../../__tests__/mocks/gemini.mock').mockGoogleGenAI
  : require('@google/genai');

// Helper to construct Gemini prompt template
const generatePrompt = (project, maxMinutes) => `
You are an expert technical project manager and study planner for Software Engineering students.
Your task is to analyze a university project and break it down into actionable, sequential study sessions.

### INPUT DATA
Course Name: "${project.courseName || 'Unknown Course'}"
Project Title: "${project.title}"
Project Description: "${project.description || 'No description provided'}"
Maximum Session Duration: ${maxMinutes} minutes

### INSTRUCTIONS & CONSTRAINTS
1. Analyze the complexity of the project and assign an overall difficulty: "easy", "medium", or "hard".
2. Break the project down into logical software engineering steps (e.g., Requirements Analysis, System Design, Coding, Testing, Documentation).
3. Estimate the time required for each step in minutes.
4. CRITICAL RULE: No single session can exceed the Maximum Session Duration (${maxMinutes} minutes). If a task takes longer, you MUST split it into multiple parts (e.g., "Coding Part 1", "Coding Part 2").
5. Write the 'title' of each session in Ukrainian.

### OUTPUT FORMAT
You must return ONLY a valid JSON object matching this schema. Do not wrap the JSON in markdown code blocks.
{
  "difficulty": "enum(easy, medium, hard)",
  "sessions": [
    {
      "title": "string (in Ukrainian)",
      "durationMinutes": "integer (must be <= ${maxMinutes})"
    }
  ]
}
`;

/**
 * AI Decomposer Service utilizing Google Gemini API.
 */
exports.decomposeProject = async (project, persona) => {
  const apiKey = process.env.GEMINI_API_KEY || 'dummy-api-key';
  const ai = new GoogleGenAI({ apiKey });

  const maxMinutes = persona.maxMinutesPerDay || (persona.maxHoursPerDay ? persona.maxHoursPerDay * 60 : 240);
  const prompt = generatePrompt(project, maxMinutes);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json'
    }
  });

  return JSON.parse(response.text);
};
