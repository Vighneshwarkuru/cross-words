import { GoogleGenerativeAI, SchemaType, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { CrosswordGenerationResult } from "./types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY ?? "";
if (!apiKey) {
  throw new Error("VITE_GEMINI_API_KEY is not set in environment variables");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Shared safety settings to prevent empty responses on complex documents
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export interface FileData {
  data: string;
  mimeType: string;
}

// ---- Utility validation helpers ----
const WORD_REGEX = /^[A-Z]{3,12}$/;

function validateCrossword(result: CrosswordGenerationResult) {
  const grid = new Map<string, { letter: string; word: string }>();
  const wordAnchors: Array<[number, number]> = [];

  for (const q of result.questions) {
    if (!WORD_REGEX.test(q.word)) {
      throw new Error(`Invalid word format: ${q.word}`);
    }

    if (!Number.isInteger(q.row) || !Number.isInteger(q.col)) {
      throw new Error(`Row/col must be integers for word: ${q.word}`);
    }

    const dr = q.direction === "across" ? 0 : 1;
    const dc = q.direction === "across" ? 1 : 0;

    for (let i = 0; i < q.word.length; i++) {
      const r = q.row + dr * i;
      const c = q.col + dc * i;
      const key = `${r},${c}`;
      const letter = q.word[i];

      const existing = grid.get(key);
      if (existing && existing.letter !== letter) {
        throw new Error(`Grid collision at ${key}: Word "${q.word}" (letter ${letter}) conflicts with Word "${existing.word}" (letter ${existing.letter})`);
      }
      grid.set(key, { letter, word: q.word });
    }

    wordAnchors.push([q.row, q.col]);
  }

  // Connectivity check (graph must be connected)
  const visited = new Set<string>();
  if (wordAnchors.length === 0) throw new Error("No words generated in the grid.");
  const stack = [wordAnchors[0]];

  while (stack.length) {
    const stackItem = stack.pop();
    if (!stackItem) continue;
    const [r, c] = stackItem;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);

    for (const [nr, nc] of [
      [r + 1, c],
      [r - 1, c],
      [r, c + 1],
      [r, c - 1],
    ]) {
      if (grid.has(`${nr},${nc}`)) {
        stack.push([nr, nc]);
      }
    }
  }

  if (visited.size !== grid.size) {
    throw new Error("Generated crossword grid is not fully connected. Ensure all words link back to a single shared structure.");
  }
}

export const generateCrossword = async (
  topic: string,
  content: string,
  numQuestions: number,
  fileData?: FileData
): Promise<CrosswordGenerationResult> => {
  // Use gemini-2.5-flash for maximum stability and speed
  const modelId = "gemini-2.5-flash";

  // ---- STAGE 1: Technical Term Extraction (RAG) ----
  const stage1Prompt = `
SYSTEM: You are an expert academic curriculum designer.
TASK: Extract exactly ${numQuestions + 5} technical terms and their concise definitions from the provided source material.
STRICT RULES:
1. ONLY use terms found in the source.
2. Definitions must be short (max 15 words).
3. Terms must be 3-12 letters, uppercase A-Z only.
4. Focus on core concepts related to "${topic}".
`;

  const stage1Parts: any[] = [];
  if (fileData) {
    stage1Parts.push({
      inlineData: {
        data: fileData.data,
        mimeType: fileData.mimeType,
      },
    });
  }
  stage1Parts.push({ text: `SOURCE TEXT:\n${content.slice(0, 30000)}\n\n${stage1Prompt}` });

  const stage1Model = genAI.getGenerativeModel({
    model: modelId,
    safetySettings,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          terms: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                word: { type: SchemaType.STRING },
                definition: { type: SchemaType.STRING },
              },
              required: ["word", "definition"],
            },
          },
        },
        required: ["terms"],
      },
    },
  });

  console.log("Stage 1: Extracting terms...");
  const stage1Result = await stage1Model.generateContent(stage1Parts);

  if (!stage1Result.response?.candidates?.[0]) {
    throw new Error("Stage 1 failed: No response candidates found. Content may have been blocked by safety filters.");
  }

  const termsText = stage1Result.response.text();
  const { terms } = JSON.parse(termsText);
  console.log(`Stage 1: Extracted ${terms.length} terms.`);

  // ---- STAGE 2: Crossword Layout Generation ----
  const stage2BasePrompt = `
SYSTEM: You are a crossword architect.
TASK: Create a connected crossword grid using exactly ${numQuestions} words.

WORD LIST:
${terms.map((t: any) => `- ${t.word}: ${t.definition}`).join("\n")}

RULES:
1. Every word MUST intersect at least one other word.
2. Intersecting cells MUST share the same letter.
3. Coordinates (row, col) start at (0,0).
4. DO NOT overlap words unless they share a valid letter.

OUTPUT:
Return JSON with the original title and subject, and an array of ${numQuestions} questions.
`;

  const MAX_RETRIES = 3;
  let lastError: Error | null = null;
  let feedbackMessage = "";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Stage 2: Layout Attempt ${attempt}/${MAX_RETRIES}`);

      const fullStage2Prompt = feedbackMessage
        ? `${stage2BasePrompt}\n\nFIX REQUEST: ${feedbackMessage}`
        : stage2BasePrompt;

      const stage2Model = genAI.getGenerativeModel({
        model: modelId,
        safetySettings,
        generationConfig: {
          temperature: 0.2, // Slightly higher for better exploration
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              subject: { type: SchemaType.STRING },
              questions: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    word: { type: SchemaType.STRING },
                    clue: { type: SchemaType.STRING },
                    direction: { type: SchemaType.STRING, enum: ["across", "down"] },
                    row: { type: SchemaType.NUMBER },
                    col: { type: SchemaType.NUMBER },
                  },
                  required: ["word", "clue", "direction", "row", "col"],
                },
              },
            },
            required: ["title", "subject", "questions"],
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Layout generation timed out after 120 seconds`)),
          120_000
        )
      );

      const result = (await Promise.race([
        stage2Model.generateContent(fullStage2Prompt),
        timeoutPromise,
      ])) as any;

      if (!result.response?.candidates?.[0]) {
        throw new Error("Stage 2 failed: No response candidates found. Content may have been blocked or the AI produced an empty result.");
      }

      const rawText = result.response.text();
      if (!rawText) throw new Error("Empty response from AI engine");

      let parsed: CrosswordGenerationResult;
      try {
        parsed = JSON.parse(rawText);
      } catch (e) {
        feedbackMessage = "The previous response was invalid JSON. Please return valid JSON only.";
        throw new Error("Invalid JSON in AI response");
      }

      try {
        validateCrossword(parsed);
        // Ensure we only return the count requested
        parsed.questions = parsed.questions.slice(0, numQuestions);
        return parsed;
      } catch (validationErr: any) {
        console.warn(`Validation failed on attempt ${attempt}:`, validationErr.message);
        feedbackMessage = `Coordinate Error: ${validationErr.message}. Ensure every shared cell has the exact same letter for both words.`;
        throw validationErr;
      }

    } catch (error: any) {
      console.warn(`Stage 2: Attempt ${attempt} encountered error:`, error.message);
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  throw new Error(`Failed to generate a valid crossword after ${MAX_RETRIES} attempts. Error: ${lastError?.message}`);
};
