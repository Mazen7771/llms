import { getSetting } from "@/lib/settings";

const AI_MODEL = process.env.AI_MODEL || "gemini-2.0-flash";

interface GenerateQuizParams {
  topicName: string;
  subjectName: string;
  unitName: string;
  questionCount?: number;
  questionTypes?: string[];
  difficulty?: "easy" | "medium" | "hard" | "mixed";
}

interface GeneratedOption {
  text: string;
  isCorrect: boolean;
}

interface GeneratedQuestion {
  prompt: string;
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "ESSAY";
  marks: number;
  options: GeneratedOption[];
}

interface GenerateQuizResult {
  questions: GeneratedQuestion[];
  model: string;
  usage?: { promptTokens: number; completionTokens: number };
}

/**
 * Build a Gemini-compatible generation prompt for quiz questions.
 */
function buildPrompt(params: GenerateQuizParams): string {
  const { topicName, subjectName, unitName, questionCount = 10, questionTypes = ["MULTIPLE_CHOICE"], difficulty = "mixed" } = params;
  const typeList = questionTypes.join(", ");

  return `You are an expert university instructor generating quiz questions for a Learning Management System.

**Subject:** ${subjectName}
**Unit:** ${unitName}
**Topic:** ${topicName}
**Number of questions:** ${questionCount}
**Question types:** ${typeList}
**Difficulty level:** ${difficulty}

Generate exactly ${questionCount} quiz questions. Return ONLY a valid JSON array (no markdown fences, no explanation). Each element must have this exact shape:

{
  "prompt": "Question text here",
  "type": "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "ESSAY",
  "marks": 1,
  "options": [
    { "text": "Option A text", "isCorrect": true },
    { "text": "Option B text", "isCorrect": false },
    { "text": "Option C text", "isCorrect": false },
    { "text": "Option D text", "isCorrect": false }
  ]
}

Rules:
- For MULTIPLE_CHOICE: exactly 4 options, exactly one with isCorrect: true. Always return the options array.
- For SHORT_ANSWER: empty options array [].
- For ESSAY: empty options array [].
- Questions should be academically rigorous and clear.
- Distribute difficulty: ~30% easy, ~50% medium, ~20% hard (for "mixed" difficulty).
- Use realistic university-level content. Avoid trivial or ambiguous questions.`;
}

/**
 * Call the Gemini API for text generation.
 */
async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const model = AI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errBody.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned no text in response");
  }
  return text;
}

/**
 * Generate quiz questions via Gemini.
 */
export async function generateQuiz(params: GenerateQuizParams): Promise<GenerateQuizResult> {
  const prompt = buildPrompt(params);
  const raw = await callGemini(prompt);

  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  let questions: GeneratedQuestion[];
  try {
    questions = JSON.parse(cleaned);
  } catch {
    throw new Error("AI returned invalid JSON. Please try again or adjust the prompt.");
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("AI returned an empty or non-array response.");
  }

  // Validate and normalize
  const normalized: GeneratedQuestion[] = questions.map((q) => ({
    prompt: String(q.prompt || ""),
    type: ["MULTIPLE_CHOICE", "SHORT_ANSWER", "ESSAY"].includes(q.type) ? q.type : "MULTIPLE_CHOICE",
    marks: typeof q.marks === "number" ? q.marks : 1,
    options: Array.isArray(q.options) ? q.options.map((o: GeneratedOption) => ({
      text: String(o.text || ""),
      isCorrect: Boolean(o.isCorrect),
    })) : [],
  }));

  return {
    questions: normalized,
    model: AI_MODEL,
  };
}
