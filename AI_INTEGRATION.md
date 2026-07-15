``` javascript
const generatePrompt = (project, persona) => `
You are an expert technical project manager and study planner for Software Engineering students.
Your task is to analyze a university project and break it down into actionable, sequential study sessions.

### INPUT DATA
Course Name: "${project.courseName}"
Project Title: "${project.title}"
Project Description: "${project.description || 'No description provided'}"
Maximum Session Duration: ${persona.maxMinutesPerDay} minutes

### INSTRUCTIONS & CONSTRAINTS
1. Analyze the complexity of the project and assign an overall difficulty: "easy", "medium", or "hard".
2. Break the project down into logical software engineering steps (e.g., Requirements Analysis, System Design, Coding, Testing, Documentation).
3. Estimate the time required for each step in minutes.
4. CRITICAL RULE: No single session can exceed the Maximum Session Duration (${persona.maxMinutesPerDay} minutes). If a task takes longer, you MUST split it into multiple parts (e.g., "Coding Part 1", "Coding Part 2").
5. Write the 'title' of each session in Ukrainian.

### OUTPUT FORMAT
You must return ONLY a valid JSON object matching this schema. Do not wrap the JSON in markdown code blocks.
{
  "difficulty": "enum(easy, medium, hard)",
  "sessions": [
    {
      "title": "string (in Ukrainian)",
      "durationMinutes": "integer (must be <= ${persona.maxMinutesPerDay})"
    }
  ]
}
`;
```

Expected output from AI (JSON):

``` json
{
  "difficulty": "hard",
  "sessions": [
    { "title": "Аналіз вимог", "durationMinutes": 120 },
    { "title": "Проєктування БД", "durationMinutes": 180 }
  ]
}
```

Example code (how it will look):

```javascript
await prisma.$transaction([
  // 1. Update project difficulty
  prisma.project.update({
    where: { id: projectId },
    data: { estimatedDifficulty: aiResponse.difficulty }
  }),
  
  // 2. Create all sessions
  prisma.studySession.createMany({
    data: aiResponse.sessions.map(session => ({
      projectId: projectId,
      title: session.title,
      durationMinutes: session.durationMinutes
      // time will be scheduled later by scheduler algorithm
    }))
  })
]);
```
