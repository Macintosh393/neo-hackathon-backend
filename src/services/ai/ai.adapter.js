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
4. CRITICAL RULE: No single session can exceed the Maximum Session Duration (${maxMinutes} minutes). If a task takes longer, you MUST split it into multiple parts (e.g., "Coding Part 1", "Coding Part 2"). Sessions also MUST NOT be shorter than 15 minutes.
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
 * Decomposes a university project into AI-generated study sessions.
 *
 * @param {{ courseName, title, description }} project
 * @param {{ maxMinutesPerDay?, maxHoursPerDay? }} persona
 * @returns {Promise<{ difficulty: string, sessions: Array<{ title: string, durationMinutes: number }> }>}
 */
export const decomposeProject = async (project, persona) => {
  const apiKey = process.env.GEMINI_API_KEY || 'dummy-api-key';

  // Detect test/dummy keys and throw an error immediately
  if (apiKey === 'AIzaSyDummyKeyForTesting' || apiKey.includes('DummyKey') || apiKey === 'dummy-api-key') {
    throw new Error('[AI Adapter] Dummy API key detected. Provide a real GEMINI_API_KEY to use the AI service.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const maxMinutes = persona.maxMinutesPerDay || (persona.maxHoursPerDay ? persona.maxHoursPerDay * 60 : 240);
  const prompt = generatePrompt(project, maxMinutes);

  let retries = 3;
  let delayMs = 15000; // Start with 15 seconds

  while (retries >= 0) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      return JSON.parse(response.text);
    } catch (error) {
      const isRateLimit = error.message && error.message.includes('429');
      
      if (isRateLimit && retries > 0) {
        logger.warn(`[AI Adapter] Rate limited by Gemini API. Retrying in ${delayMs / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        retries--;
        delayMs *= 2; // exponential backoff
        continue;
      }
      
      logger.error({ err: error }, '[AI Adapter] Gemini API call failed entirely after retries.');
      throw error;
    }
  }
};

export default { decomposeProject };
