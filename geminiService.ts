
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { CrosswordGenerationResult } from "./types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
if (!apiKey) {
  console.error('VITE_GEMINI_API_KEY is not set in environment variables');
}
const genAI = new GoogleGenerativeAI(apiKey);

export interface FileData {
  data: string;
  mimeType: string;
}

export const generateCrossword = async (
  topic: string,
  content: string,
  numQuestions: number,
  fileData?: FileData
): Promise<CrosswordGenerationResult> => {
  // Ultra-strict prompt for relevance and speed
  const prompt = `
    SYSTEM: You are an expert academic assessment designer.
    CONTEXT: ${topic}
    SOURCE MATERIAL: ${fileData ? 'The attached document.' : 'The provided text below.'}
    
    TASK:
    Generate ${numQuestions} crossword questions (word + clue).
    
    STRICT GROUNDING RULES:
    1. ONLY use technical terms, key concepts, and academic vocabulary found directly in the source material.
    2. DO NOT use generic or unrelated words (like common objects or unrelated general knowledge).
    3. Clues must be educational and derived from the specific definitions or contexts used in the source.
    4. Words must be 3-12 letters long, uppercase (A-Z only).
    5. Construct a valid, connected 2D grid. Ensure all words intersect properly.
    
    SOURCE TEXT (if provided):
    ${content.substring(0, 30000)}

    OUTPUT FORMAT:
    Return strictly a JSON object with this structure (no markdown, no backticks):
    {
      "title": "Assessment Title",
      "subject": "Subject Name",
      "questions": [
        {
          "word": "EXAMPLE",
          "clue": "An illustrative instance used to explain a concept in [Subject].",
          "direction": "across",
          "row": 0,
          "col": 0
        }
      ]
    }
  `;

  const parts: any[] = [];

  if (fileData) {
    parts.push({
      inlineData: {
        data: fileData.data,
        mimeType: fileData.mimeType,
      },
    });
  }

  parts.push({ text: prompt });

  // Revert to stable gemini-1.5-flash to fix loading issues
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
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
                direction: { type: SchemaType.STRING, enum: ['across', 'down'] },
                row: { type: SchemaType.NUMBER },
                col: { type: SchemaType.NUMBER },
              },
              required: ['word', 'clue', 'direction', 'row', 'col'],
            },
          },
        },
        required: ['title', 'subject', 'questions'],
      },
    },
  });

  try {
    // Add a 90-second timeout to prevent infinite loading (large PDFs can take time)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out after 90 seconds")), 90000)
    );

    const result = await Promise.race([
      model.generateContent(parts),
      timeoutPromise
    ]) as any;

    const response = result.response;
    const resultText = response.text();

    if (!resultText) {
      console.warn('Gemini response empty. Finish reason:', response.candidates?.[0]?.finishReason);
      throw new Error("AI returned no content (Safety Block or Empty).");
    }

    console.log('Gemini API Response:', resultText);
    return JSON.parse(resultText) as CrosswordGenerationResult;

  } catch (error: any) {
    console.error('Gemini Generation Error:', error);
    throw new Error(error.message || "Failed to generate crossword.");
  }
};
