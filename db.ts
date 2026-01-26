
import { Assessment, Question, Response } from './types';

/**
 * DATABASE SCHEMA (SQL) - Provided for real Supabase setup:
 * 
 * CREATE TABLE assessments (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   title TEXT NOT NULL,
 *   subject TEXT NOT NULL,
 *   faculty_name TEXT NOT NULL,
 *   deadline TIMESTAMP WITH TIME ZONE,
 *   class_section TEXT,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE questions (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
 *   word TEXT NOT NULL,
 *   clue TEXT NOT NULL,
 *   direction TEXT CHECK (direction IN ('across', 'down')),
 *   row INTEGER NOT NULL,
 *   col INTEGER NOT NULL
 * );
 * 
 * CREATE TABLE responses (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
 *   roll_number TEXT NOT NULL,
 *   student_name TEXT,
 *   answers_json JSONB NOT NULL,
 *   score INTEGER NOT NULL,
 *   total_questions INTEGER NOT NULL,
 *   submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   time_taken INTEGER,
 *   UNIQUE(assessment_id, roll_number)
 * );
 */

const STORAGE_KEYS = {
  ASSESSMENTS: 'autocross_assessments',
  QUESTIONS: 'autocross_questions',
  RESPONSES: 'autocross_responses',
};

const getFromStorage = <T,>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveToStorage = <T,>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const db = {
  async createAssessment(assessment: Omit<Assessment, 'id' | 'created_at'>, questions: Omit<Question, 'id' | 'assessment_id'>[]): Promise<string> {
    const assessments = getFromStorage<Assessment>(STORAGE_KEYS.ASSESSMENTS);
    const id = Math.random().toString(36).substr(2, 9);
    const newAssessment: Assessment = {
      ...assessment,
      id,
      created_at: new Date().toISOString(),
    };
    assessments.push(newAssessment);
    saveToStorage(STORAGE_KEYS.ASSESSMENTS, assessments);

    const allQuestions = getFromStorage<Question>(STORAGE_KEYS.QUESTIONS);
    const newQuestions: Question[] = questions.map((q) => ({
      ...q,
      id: Math.random().toString(36).substr(2, 9),
      assessment_id: id,
    }));
    allQuestions.push(...newQuestions);
    saveToStorage(STORAGE_KEYS.QUESTIONS, allQuestions);

    return id;
  },

  async getAssessment(id: string): Promise<{ assessment: Assessment; questions: Question[] } | null> {
    const assessments = getFromStorage<Assessment>(STORAGE_KEYS.ASSESSMENTS);
    const assessment = assessments.find((a) => a.id === id);
    if (!assessment) return null;

    const allQuestions = getFromStorage<Question>(STORAGE_KEYS.QUESTIONS);
    const questions = allQuestions.filter((q) => q.assessment_id === id);
    return { assessment, questions };
  },

  async getAssessmentsByFaculty(facultyName: string): Promise<Assessment[]> {
    const assessments = getFromStorage<Assessment>(STORAGE_KEYS.ASSESSMENTS);
    return assessments.filter(a => a.faculty_name.toLowerCase() === facultyName.toLowerCase());
  },

  async submitResponse(response: Omit<Response, 'id' | 'submitted_at'>): Promise<string> {
    const responses = getFromStorage<Response>(STORAGE_KEYS.RESPONSES);
    
    // Check if roll number already submitted
    const existing = responses.find(r => r.assessment_id === response.assessment_id && r.roll_number === response.roll_number);
    if (existing) {
        throw new Error('You have already submitted this assessment.');
    }

    const id = Math.random().toString(36).substr(2, 9);
    const newResponse: Response = {
      ...response,
      id,
      submitted_at: new Date().toISOString(),
    };
    responses.push(newResponse);
    saveToStorage(STORAGE_KEYS.RESPONSES, responses);
    return id;
  },

  async getResponses(assessmentId: string): Promise<Response[]> {
    const responses = getFromStorage<Response>(STORAGE_KEYS.RESPONSES);
    return responses.filter((r) => r.assessment_id === assessmentId);
  }
};
