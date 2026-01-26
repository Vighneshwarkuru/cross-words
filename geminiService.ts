
import { GoogleGenAI, Type } from "@google/genai";
import { CrosswordGenerationResult } from "./types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

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

    OUTPUT JSON ONLY.
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

  // Use gemini-1.5-flash for balance of speed and cost/quotas
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: { parts },
    config: {
      temperature: 0.1, // Near-zero for accuracy
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          subject: { type: Type.STRING },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                clue: { type: Type.STRING },
                direction: { type: Type.STRING, enum: ['across', 'down'] },
                row: { type: Type.INTEGER },
                col: { type: Type.INTEGER },
              },
              required: ['word', 'clue', 'direction', 'row', 'col'],
            },
          },
        },
        required: ['title', 'subject', 'questions'],
      },
    },
  });

  const resultText = response.text;
  if (!resultText) throw new Error("No response from AI");

  return JSON.parse(resultText) as CrosswordGenerationResult;
};
