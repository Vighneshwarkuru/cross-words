
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateCrossword, FileData } from '../geminiService';

import { parseFile } from '../fileParser';
import { db } from '../db';
import { Question } from '../types';

type Step = 'config' | 'generating' | 'review';

const FacultyCreate: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('config');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isManualMode, setIsManualMode] = useState(false);

  const [formData, setFormData] = useState({
    facultyName: '',
    subject: '',
    title: '',
    topic: '',
    content: '',
    questionsCount: 10,
    deadline: '',
    classSection: '',
  });

  const [questions, setQuestions] = useState<Omit<Question, 'id' | 'assessment_id'>[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    // Parse text locally for display/manual use
    try {
      const text = await parseFile(file);
      setFormData(prev => ({ ...prev, content: text }));
    } catch (err) {
      console.error("Local parsing failed:", err);
      // Fallback or just ignore if it's purely for Gemini later
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      setSelectedFile({ data: base64String, mimeType: file.type || 'application/pdf' });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isManualMode) {
      setQuestions(Array(formData.questionsCount).fill({ word: '', clue: '', direction: 'across', row: 0, col: 0 }));
      setStep('review');
      return;
    }

    setStep('generating');
    setLoading(true);
    try {
      console.log('Starting generation with:', {
        topic: formData.topic,
        contentLength: formData.content.length,
        hasFile: !!selectedFile,
        questionsCount: formData.questionsCount
      });

      const aiResult = await generateCrossword(
        formData.topic,
        formData.content,
        formData.questionsCount,
        selectedFile || undefined
      );
      
      console.log('Generation successful:', aiResult);
      setQuestions(aiResult.questions);
      setStep('review');
    } catch (err) {
      console.error('Generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Generation failed: ${errorMessage}\n\nPlease check:\n1. Your API key is set correctly\n2. The PDF contains readable text\n3. You have internet connection`);
      setStep('config');
    } finally {
      setLoading(false);
    }
  };

  const updateQuestion = (index: number, field: 'word' | 'clue', value: string) => {
    const updated = [...questions];
    updated[index] = {
      ...updated[index],
      [field]: field === 'word' ? value.toUpperCase().replace(/[^A-Z]/g, '') : value
    };
    setQuestions(updated);
  };

  const handlePublish = async () => {
    setLoading(true);
    try {
      const assessmentId = await db.createAssessment({
        title: formData.title,
        subject: formData.subject,
        faculty_name: formData.facultyName,
        deadline: formData.deadline,
        class_section: formData.classSection,
      }, questions);
      navigate(`/dashboard?id=${assessmentId}`);
    } catch (err) {
      alert('Publishing failed.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="relative w-28 h-28 mb-10">
          <div className="absolute inset-0 border-4 border-teal-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-teal-500">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a2 2 0 00-1.96 1.414l-.727 2.903a2 2 0 01-3.577 1.12l-1.914-1.914a2 2 0 00-2.45-.308l-2.903.727a2 2 0 01-1.414-1.96l.477-2.387a2 2 0 00-.547-1.022L1.22 11.22a2 2 0 011.12-3.577l2.903-.727a2 2 0 001.414-1.96l.477-2.387a2 2 0 013.577-1.12l1.914 1.914a2 2 0 002.45.308l2.903-.727a2 2 0 011.414 1.96l-.477 2.387a2 2 0 00.547 1.022l1.782 1.782a2 2 0 01-1.12 3.577l-2.903.727a2 2 0 00-1.414 1.96l-.477 2.387a2 2 0 01-3.577 1.12l-1.914-1.914a2 2 0 00-2.45-.308l-2.903.727a2 2 0 01-1.414-1.96l.477-2.387a2 2 0 00-.547-1.022L1.22 12.78a2 2 0 011.12-3.577l2.903-.727a2 2 0 001.414-1.96l.477-2.387a2 2 0 013.577-1.12l1.914 1.914a2 2 0 002.45.308l2.903-.727a2 2 0 011.414 1.96l-.477 2.387a2 2 0 00.547 1.022l1.782 1.782z" />
            </svg>
          </div>
        </div>
        <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Extracting Academic Terms...</h2>
        <p className="text-slate-400 max-w-sm mx-auto leading-relaxed">
          Gemini 3 Flash is performing a high-speed semantic analysis of your material to generate strictly relevant questions.
        </p>
      </div>
    );
  }

  if (step === 'review') {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-black text-white">Review & Fine-Tune</h2>
            <p className="text-slate-400 text-sm mt-1">AI has extracted these terms. You can refine them for accuracy before publishing.</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button
              onClick={() => setStep('config')}
              className="flex-1 md:flex-none px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-sm font-bold transition-all"
            >
              Start Over
            </button>
            <button
              onClick={handlePublish}
              disabled={loading}
              className="flex-1 md:flex-none px-10 py-3 bg-teal-600 hover:bg-teal-500 rounded-2xl text-sm font-black text-white transition-all shadow-xl shadow-teal-500/10 flex items-center justify-center gap-2"
            >
              {loading ? 'Publishing...' : 'Publish Assessment'}
              {!loading && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>}
            </button>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <button
            onClick={() => setQuestions([...questions, { word: '', clue: '', direction: 'across', row: 0, col: 0 }])}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Add Question
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-2 scrollbar-thin">
          {questions.map((q, idx) => (
            <div key={idx} className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4 hover:border-purple-500/50 transition-all group relative">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                  Question {idx + 1} • {q.direction}
                </span>
                <span className="text-[10px] text-slate-500 italic">Position: {q.row}, {q.col}</span>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Answer</label>
                <input
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-teal-400 font-mono font-bold uppercase outline-none focus:border-teal-500 transition-all"
                  value={q.word}
                  onChange={(e) => updateQuestion(idx, 'word', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Educational Clue</label>
                <textarea
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 outline-none focus:border-purple-500 resize-none transition-all"
                  value={q.clue}
                  onChange={(e) => updateQuestion(idx, 'clue', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-slate-900/40 border border-slate-800 p-8 md:p-12 rounded-[2.5rem] shadow-2xl">
      <div className="mb-10 text-center md:text-left">
        <h2 className="text-4xl font-black text-white tracking-tight">Generate <span className="text-purple-500">Puzzle</span></h2>
        <p className="text-slate-400 text-base mt-2">Create an AI-powered assessment in under 30 seconds.</p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Faculty Name</label>
            <input required name="facultyName" className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-purple-500 transition-all" placeholder="Dr. Alexander Wright" value={formData.facultyName} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Subject</label>
            <input required name="subject" className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-teal-500 transition-all" placeholder="Modern Physics" value={formData.subject} onChange={handleChange} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Assessment Title</label>
          <input required name="title" className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Weekly Quiz: Quantum Mechanics" value={formData.title} onChange={handleChange} />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Study Material (PDF)</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`group border-2 border-dashed rounded-[2rem] p-12 transition-all cursor-pointer flex flex-col items-center justify-center text-center ${fileName ? 'border-teal-500 bg-teal-500/5' : 'border-slate-800 bg-slate-950/30 hover:border-slate-600 hover:bg-slate-900/50'
              }`}
          >
            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.doc,.pptx,.ppt" onChange={handleFileChange} />
            {fileName ? (
              <>
                <div className="w-16 h-16 bg-teal-500/20 text-teal-400 rounded-2xl flex items-center justify-center mb-5"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>
                <p className="text-base font-black text-teal-400">{fileName}</p>
                <button type="button" onClick={(e) => { e.stopPropagation(); setFileName(''); setSelectedFile(null); }} className="text-xs text-red-400 font-bold uppercase mt-3 hover:underline">Replace File</button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-slate-800 text-slate-500 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"><svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg></div>
                <p className="text-base text-slate-300 font-bold">Drag & Drop PDF, DOCX, or PPTX</p>
                <p className="text-xs text-slate-500 mt-2 font-medium">Text will be extracted for generation or manual use.</p>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Specific Topic Focus (Optional)</label>
          <input name="topic" className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-purple-500 transition-all" placeholder="e.g. Wave-Particle Duality" value={formData.topic} onChange={handleChange} />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Deadline</label>
            <input required type="datetime-local" name="deadline" className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 outline-none text-slate-400" value={formData.deadline} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Word Count</label>
            <select name="questionsCount" className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 outline-none text-slate-100" value={formData.questionsCount} onChange={handleChange}>
              <option value={8}>8 Questions (Fastest)</option>
              <option value={12}>12 Questions (Balanced)</option>
              <option value={15}>15 Questions (Complex)</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => { setIsManualMode(true); handleGenerate({ preventDefault: () => { } } as React.FormEvent); }}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black py-5 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3 text-lg"
          >
            Manual Entry
          </button>
          <button
            type="submit"
            onClick={() => setIsManualMode(false)}
            className="flex-[2] bg-gradient-to-r from-purple-600 to-blue-600 hover:brightness-110 active:scale-[0.98] text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-purple-500/20 flex items-center justify-center gap-3 text-lg"
          >
            High-Speed AI Extraction
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default FacultyCreate;
