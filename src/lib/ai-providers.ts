/**
 * AI Provider Abstraction Layer
 * Supports Google Gemini and DeepSeek with fallback
 */

export interface AIProvider {
  name: string;
  generateQuiz(prompt: string, options: GenerationOptions): Promise<GeneratedQuiz>;
}

export interface GenerationOptions {
  questionCount: number;
  types: QuestionType[];
  difficulty: "core" | "extended" | "mixed";
  subject: string;
  unit: string;
  topic: string;
}

export type QuestionType = "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "ESSAY";

export interface GeneratedQuiz {
  title: string;
  timeLimitSeconds?: number;
  questions: GeneratedQuestion[];
}

export interface GeneratedQuestion {
  prompt: string;
  type: QuestionType;
  marks: number;
  options?: GeneratedOption[];
  explanation?: string;
  markScheme?: string;
}

export interface GeneratedOption {
  text: string;
  isCorrect: boolean;
}

// ============================================
// GOOGLE GEMINI PROVIDER
// ============================================

class GeminiProvider implements AIProvider {
  name = "gemini";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = process.env.GEMINI_MODEL || "gemini-2.0-flash") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateQuiz(prompt: string, options: GenerationOptions): Promise<GeneratedQuiz> {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: this.model });

    const fullPrompt = this.buildPrompt(prompt, options);

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });

    const response = await result.response;
    const text = response.text();

    return this.parseResponse(text);
  }

  private buildPrompt(basePrompt: string, options: GenerationOptions): string {
    const typeInstructions = options.types.map(t => {
      switch (t) {
        case "MULTIPLE_CHOICE":
          return `- MULTIPLE_CHOICE: 4 options (A, B, C, D), exactly ONE correct. Include "explanation" field.`;
        case "SHORT_ANSWER":
          return `- SHORT_ANSWER: Requires 1-3 sentence answer. Include "markScheme" with key points.`;
        case "ESSAY":
          return `- ESSAY: Requires structured response. Include "markScheme" with detailed criteria.`;
      }
    }).join("\n");

    return `${basePrompt}

IMPORTANT: Return ONLY valid JSON matching this exact schema:
{
  "title": "Quiz Title",
  "timeLimitSeconds": 1800,
  "questions": [
    {
      "prompt": "Question text here?",
      "type": "MULTIPLE_CHOICE",
      "marks": 2,
      "options": [
        {"text": "Option A", "isCorrect": false},
        {"text": "Option B", "isCorrect": true},
        {"text": "Option C", "isCorrect": false},
        {"text": "Option D", "isCorrect": false}
      ],
      "explanation": "Why B is correct and others are not"
    }
  ]
}

Requirements:
- Generate exactly ${options.questionCount} questions
- Question types: ${options.types.join(", ")}
- Difficulty: ${options.difficulty} (IGCSE ${options.difficulty === "core" ? "Core (grades C-G)" : options.difficulty === "extended" ? "Extended (grades A*-C)" : "Mixed Core and Extended"})
- Subject: ${options.subject}
- Unit: ${options.unit}
- Topic: ${options.topic}

${typeInstructions}

For MULTIPLE_CHOICE: Always provide exactly 4 options with exactly 1 correct.
For SHORT_ANSWER/ESSAY: Do not include options array.
Marks: 1-3 for MC, 2-5 for SA, 5-10 for ESSAY.
Use IGCSE command words: describe, explain, calculate, compare, evaluate, suggest, state, identify.`;
  }

  private parseResponse(text: string): GeneratedQuiz {
    try {
      // Clean up potential markdown code blocks
      const cleaned = text.replace(/```json\n?|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      // Validate structure
      if (!parsed.title || !Array.isArray(parsed.questions)) {
        throw new Error("Invalid response structure");
      }

      // Validate each question
      for (const q of parsed.questions) {
        if (!q.prompt || !q.type || !q.marks) {
          throw new Error("Question missing required fields");
        }
        if (q.type === "MULTIPLE_CHOICE") {
          if (!q.options || q.options.length !== 4) {
            throw new Error("MC question must have exactly 4 options");
          }
          const correctCount = q.options.filter((o: GeneratedOption) => o.isCorrect).length;
          if (correctCount !== 1) {
            throw new Error("MC question must have exactly 1 correct option");
          }
        }
      }

      return parsed;
    } catch (error) {
      console.error("Gemini parse error:", error, "Raw:", text);
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}

// ============================================
// DEEPSEEK PROVIDER
// ============================================

class DeepSeekProvider implements AIProvider {
  name = "deepseek";
  private apiKey: string;
  private baseUrl = "https://api.deepseek.com/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateQuiz(prompt: string, options: GenerationOptions): Promise<GeneratedQuiz> {
    const fullPrompt = this.buildPrompt(prompt, options);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are an expert IGCSE exam question writer. Return only valid JSON.",
          },
          { role: "user", content: fullPrompt },
        ],
        temperature: 0.7,
        max_tokens: 8192,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || "";

    return this.parseResponse(text);
  }

  private buildPrompt(basePrompt: string, options: GenerationOptions): string {
    const typeInstructions = options.types.map(t => {
      switch (t) {
        case "MULTIPLE_CHOICE":
          return `- MULTIPLE_CHOICE: 4 options (A, B, C, D), exactly ONE correct. Include "explanation" field.`;
        case "SHORT_ANSWER":
          return `- SHORT_ANSWER: Requires 1-3 sentence answer. Include "markScheme" with key points.`;
        case "ESSAY":
          return `- ESSAY: Requires structured response. Include "markScheme" with detailed criteria.`;
      }
    }).join("\n");

    return `${basePrompt}

IMPORTANT: Return ONLY valid JSON matching this exact schema:
{
  "title": "Quiz Title",
  "timeLimitSeconds": 1800,
  "questions": [
    {
      "prompt": "Question text here?",
      "type": "MULTIPLE_CHOICE",
      "marks": 2,
      "options": [
        {"text": "Option A", "isCorrect": false},
        {"text": "Option B", "isCorrect": true},
        {"text": "Option C", "isCorrect": false},
        {"text": "Option D", "isCorrect": false}
      ],
      "explanation": "Why B is correct and others are not"
    }
  ]
}

Requirements:
- Generate exactly ${options.questionCount} questions
- Question types: ${options.types.join(", ")}
- Difficulty: ${options.difficulty} (IGCSE ${options.difficulty === "core" ? "Core (grades C-G)" : options.difficulty === "extended" ? "Extended (grades A*-C)" : "Mixed Core and Extended"})
- Subject: ${options.subject}
- Unit: ${options.unit}
- Topic: ${options.topic}

${typeInstructions}

For MULTIPLE_CHOICE: Always provide exactly 4 options with exactly 1 correct.
For SHORT_ANSWER/ESSAY: Do not include options array.
Marks: 1-3 for MC, 2-5 for SA, 5-10 for ESSAY.
Use IGCSE command words: describe, explain, calculate, compare, evaluate, suggest, state, identify.`;
  }

  private parseResponse(text: string): GeneratedQuiz {
    try {
      const cleaned = text.replace(/```json\n?|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (!parsed.title || !Array.isArray(parsed.questions)) {
        throw new Error("Invalid response structure");
      }

      for (const q of parsed.questions) {
        if (!q.prompt || !q.type || !q.marks) {
          throw new Error("Question missing required fields");
        }
        if (q.type === "MULTIPLE_CHOICE") {
          if (!q.options || q.options.length !== 4) {
            throw new Error("MC question must have exactly 4 options");
          }
          const correctCount = q.options.filter((o: GeneratedOption) => o.isCorrect).length;
          if (correctCount !== 1) {
            throw new Error("MC question must have exactly 1 correct option");
          }
        }
      }

      return parsed;
    } catch (error) {
      console.error("DeepSeek parse error:", error, "Raw:", text);
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}

// ============================================
// PROVIDER FACTORY
// ============================================

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase() || "gemini";

  if (provider === "deepseek") {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY not configured");
    }
    return new DeepSeekProvider(apiKey);
  }

  // Default to Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }
  return new GeminiProvider(apiKey);
}

export async function generateQuizWithFallback(prompt: string, options: GenerationOptions): Promise<GeneratedQuiz> {
  const providers = [
    () => getAIProvider(),
    // Fallback to other provider if available
    () => {
      const primary = process.env.AI_PROVIDER?.toLowerCase() || "gemini";
      if (primary === "gemini" && process.env.DEEPSEEK_API_KEY) {
        return new DeepSeekProvider(process.env.DEEPSEEK_API_KEY);
      }
      if (primary === "deepseek" && process.env.GEMINI_API_KEY) {
        return new GeminiProvider(process.env.GEMINI_API_KEY);
      }
      return null;
    },
  ];

  let lastError: Error | null = null;

  for (const getProvider of providers) {
    const provider = getProvider();
    if (!provider) continue;

    try {
      console.log(`Generating quiz with ${provider.name}...`);
      return await provider.generateQuiz(prompt, options);
    } catch (error) {
      console.error(`${provider.name} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  throw lastError || new Error("All AI providers failed");
}