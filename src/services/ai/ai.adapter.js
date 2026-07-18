/**
 * AI Adapter — Gemini Integration
 *
 * Thin adapter over Google Gemini API responsible for decomposing
 * university projects into structured study sessions.
 * Falls back to a hardcoded session set when:
 *   - A dummy/testing API key is detected
 *   - The Gemini API call fails for any reason
 */

import { GoogleGenAI } from '@google/genai';
import { logger } from '../../config/logger.js';

/**
 * Builds the structured prompt sent to Gemini.
 *
 * @param {{ courseName, title, description }} project
 * @param {number} maxMinutes - Max session duration (from persona)
 * @returns {string} prompt text
 */
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

/** Fallback session list returned when AI is unavailable */
const buildFallbackSessions = (title) => ({
  difficulty: 'medium',
  sessions: [
    { title: `Аналіз вимог та архітектура для "${title}"`, durationMinutes: 90 },
    { title: `Проєктування схеми даних для "${title}"`, durationMinutes: 120 },
    { title: `Кодування основного функціоналу "${title}"`, durationMinutes: 180 },
    { title: `Написання юніт-тестів для "${title}"`, durationMinutes: 90 },
  ],
});

/**
 * Decomposes a university project into AI-generated study sessions.
 *
 * @param {{ courseName, title, description }} project
 * @param {{ maxMinutesPerDay?, maxHoursPerDay? }} persona
 * @returns {Promise<{ difficulty: string, sessions: Array<{ title: string, durationMinutes: number }> }>}
 */
export const decomposeProject = async (project, persona) => {
  const apiKey = process.env.GEMINI_API_KEY || 'dummy-api-key';

  // Detect test/dummy keys and return fallback immediately
  if (apiKey === 'AIzaSyDummyKeyForTesting' || apiKey.includes('DummyKey') || apiKey === 'dummy-api-key') {
    logger.warn('[AI Adapter] Dummy API key detected. Returning fallback study sessions.');
    return buildFallbackSessions(project.title);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const maxMinutes = persona.maxMinutesPerDay || (persona.maxHoursPerDay ? persona.maxHoursPerDay * 60 : 240);
    const prompt = generatePrompt(project, maxMinutes);

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    return JSON.parse(response.text);
  } catch (error) {
    logger.error({ err: error }, '[AI Adapter] Gemini API call failed. Returning fallback study sessions.');
    return buildFallbackSessions(project.title);
  }
};

export default { decomposeProject };
