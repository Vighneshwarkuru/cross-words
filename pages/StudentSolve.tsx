
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../db';
import { Assessment, Question } from '../types';

const StudentSolve: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [rollNumber, setRollNumber] = useState('');
  const [studentName, setStudentName] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [gridData, setGridData] = useState<string[][]>([]);
  const [gridSize, setGridSize] = useState({ rows: 0, cols: 0 });
  const [focusedCell, setFocusedCell] = useState<{r: number, c: number} | null>(null);

  // Store refs to inputs for focus management
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (assessmentId: string) => {
    setLoading(true);
    try {
      const data = await db.getAssessment(assessmentId);
      if (data) {
        setAssessment(data.assessment);
        setQuestions(data.questions);
        
        let maxR = 0, maxC = 0;
        data.questions.forEach(q => {
            const len = q.word.length;
            const endR = q.direction === 'across' ? q.row : q.row + len - 1;
            const endC = q.direction === 'across' ? q.col + len - 1 : q.col;
            maxR = Math.max(maxR, endR);
            maxC = Math.max(maxC, endC);
        });
        
        const rows = Math.max(maxR + 1, 5);
        const cols = Math.max(maxC + 1, 5);
        setGridSize({ rows, cols });
        
        const grid = Array(rows).fill(null).map(() => Array(cols).fill(' '));
        data.questions.forEach(q => {
            for (let i = 0; i < q.word.length; i++) {
                const r = q.direction === 'across' ? q.row : q.row + i;
                const c = q.direction === 'across' ? q.col + i : q.col;
                grid[r][c] = '_';
            }
        });
        setGridData(grid);
      } else {
        setError('Assessment code invalid or expired.');
      }
    } catch (e) {
      setError('An error occurred while loading.');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    if (!rollNumber.trim()) {
        alert('Roll number is mandatory.');
        return;
    }
    setIsStarted(true);
    setStartTime(Date.now());
  };

  const moveFocus = (r: number, c: number, dr: number, dc: number) => {
    let nextR = r + dr;
    let nextC = c + dc;
    
    // Simple bounds check and only move to input cells
    if (nextR >= 0 && nextR < gridSize.rows && nextC >= 0 && nextC < gridSize.cols) {
        if (gridData[nextR][nextC] !== ' ') {
            inputRefs.current[`${nextR}-${nextC}`]?.focus();
        }
    }
  };

  const handleCellChange = (r: number, c: number, value: string) => {
    const newVal = value.toUpperCase().slice(-1);
    const newGrid = [...gridData.map(row => [...row])];
    
    if (newVal === '') {
        newGrid[r][c] = '_';
    } else {
        newGrid[r][c] = newVal;
        // Try to figure out which direction to auto-advance
        // Check if there's a word starting or passing through here
        const q = questions.find(q => 
            (q.direction === 'across' && r === q.row && c >= q.col && c < q.col + q.word.length) ||
            (q.direction === 'down' && c === q.col && r >= q.row && r < q.row + q.word.length)
        );
        if (q) {
            if (q.direction === 'across') moveFocus(r, c, 0, 1);
            else moveFocus(r, c, 1, 0);
        }
    }
    setGridData(newGrid);
  };

  const handleKeyDown = (r: number, c: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && gridData[r][c] === '_') {
        // Try to move backward
        const q = questions.find(q => 
            (q.direction === 'across' && r === q.row && c > q.col && c < q.col + q.word.length) ||
            (q.direction === 'down' && c === q.col && r > q.row && r < q.row + q.word.length)
        );
        if (q) {
            if (q.direction === 'across') moveFocus(r, c, 0, -1);
            else moveFocus(r, c, -1, 0);
        }
    } else if (e.key === 'ArrowRight') moveFocus(r, c, 0, 1);
    else if (e.key === 'ArrowLeft') moveFocus(r, c, 0, -1);
    else if (e.key === 'ArrowDown') moveFocus(r, c, 1, 0);
    else if (e.key === 'ArrowUp') moveFocus(r, c, -1, 0);
  };

  const handleSubmit = async () => {
    if (!assessment) return;

    let score = 0;
    questions.forEach(q => {
        let currentWord = '';
        for (let i = 0; i < q.word.length; i++) {
            const r = q.direction === 'across' ? q.row : q.row + i;
            const c = q.direction === 'across' ? q.col + i : q.col;
            currentWord += gridData[r][c] === '_' ? ' ' : gridData[r][c];
        }
        if (currentWord === q.word.toUpperCase()) {
            score++;
        }
    });

    const timeTaken = Math.round((Date.now() - startTime) / 1000);

    try {
        await db.submitResponse({
            assessment_id: assessment.id,
            roll_number: rollNumber,
            student_name: studentName,
            answers_json: {},
            score,
            total_questions: questions.length,
            time_taken: timeTaken
        });
        navigate('/success', { state: { score, total: questions.length } });
    } catch (e: any) {
        alert(e.message);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400">Loading your assessment...</p>
    </div>
  );

  if (error) return (
    <div className="max-w-md mx-auto text-center py-20">
        <div className="bg-red-500/10 border border-red-500/50 p-8 rounded-3xl">
            <h2 className="text-xl font-bold text-red-500 mb-2">Oops!</h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <button onClick={() => navigate('/')} className="text-slate-100 bg-slate-800 px-6 py-2 rounded-xl hover:bg-slate-700 transition-colors">
                Return Home
            </button>
        </div>
    </div>
  );

  if (!isStarted) {
    return (
        <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl mt-8">
            <h1 className="text-2xl font-bold text-center mb-2">{assessment?.title}</h1>
            <p className="text-teal-400 text-center text-sm font-medium mb-8 uppercase tracking-wider">{assessment?.subject}</p>
            
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Roll Number (Required)</label>
                    <input 
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono"
                        placeholder="e.g. 21BCS1042"
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Student Name</label>
                    <input 
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        placeholder="Your full name"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                    />
                </div>
                <div className="pt-4">
                    <button 
                        onClick={handleStart}
                        className="w-full bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-500 hover:to-teal-500 text-white font-black py-4 rounded-2xl shadow-lg transition-all transform active:scale-[0.98]"
                    >
                        START ASSESSMENT
                    </button>
                </div>
            </div>
            
            <div className="mt-8 flex items-center gap-3 p-4 bg-slate-950/50 rounded-2xl border border-slate-800 text-xs text-slate-400">
                <svg className="w-5 h-5 text-teal-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <p>Ensure you have a stable connection. Your time is tracked and accuracy is key for a high score.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Puzzle Board */}
        <div className="flex-grow w-full bg-slate-900/40 p-4 md:p-8 rounded-3xl border border-slate-800 shadow-xl overflow-auto">
            <div 
                className="grid gap-1 mx-auto" 
                style={{ 
                    gridTemplateColumns: `repeat(${gridSize.cols}, minmax(32px, 1fr))`,
                    width: 'fit-content'
                }}
            >
                {gridData.map((row, r) => row.map((cell, c) => {
                    const isInput = cell !== ' ';
                    const qAcross = questions.find(q => q.row === r && q.col === c && q.direction === 'across');
                    const qDown = questions.find(q => q.row === r && q.col === c && q.direction === 'down');
                    const qNum = qAcross || qDown ? questions.indexOf(qAcross || qDown!) + 1 : null;

                    return (
                        <div 
                            key={`${r}-${c}`} 
                            className={`relative w-8 h-8 md:w-11 md:h-11 border rounded-md transition-all ${
                                isInput ? 'bg-slate-950 border-slate-700' : 'bg-transparent border-transparent'
                            } ${focusedCell?.r === r && focusedCell?.c === c ? 'ring-2 ring-teal-500 z-10' : ''}`}
                        >
                            {qNum && <span className="absolute top-0.5 left-1 text-[9px] text-teal-500 font-black leading-none pointer-events-none select-none">{qNum}</span>}
                            {isInput && (
                                <input 
                                    ref={el => inputRefs.current[`${r}-${c}`] = el}
                                    className="w-full h-full text-center bg-transparent text-slate-100 font-bold text-base md:text-xl outline-none uppercase caret-transparent"
                                    maxLength={1}
                                    value={cell === '_' ? '' : cell}
                                    onFocus={() => setFocusedCell({r, c})}
                                    onBlur={() => setFocusedCell(null)}
                                    onChange={(e) => handleCellChange(r, c, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(r, c, e)}
                                />
                            )}
                        </div>
                    );
                }))}
            </div>
            
            <div className="mt-12 flex flex-col items-center gap-4">
                <button 
                    onClick={handleSubmit}
                    className="group bg-teal-600 hover:bg-teal-500 text-white font-black py-4 px-16 rounded-2xl shadow-xl transition-all flex items-center gap-3"
                >
                    Final Submission
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </button>
                <p className="text-slate-500 text-xs italic">Review your answers carefully before submitting.</p>
            </div>
        </div>

        {/* Clues Panel */}
        <div className="lg:w-96 w-full space-y-6 lg:sticky lg:top-24">
            <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 max-h-[75vh] overflow-y-auto scrollbar-thin">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Clues</h2>
                    <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-1 rounded-full uppercase font-bold tracking-tighter">Code: {id}</span>
                </div>

                <div className="space-y-8">
                    <section>
                        <h3 className="text-sm font-black text-purple-400 mb-4 uppercase flex items-center gap-2 tracking-widest">
                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                            Across
                        </h3>
                        <div className="space-y-4">
                            {questions.filter(q => q.direction === 'across').map((q) => (
                                <div key={q.id} className="group cursor-pointer" onClick={() => inputRefs.current[`${q.row}-${q.col}`]?.focus()}>
                                    <div className="flex gap-3">
                                        <span className="font-black text-teal-500 text-sm">{questions.indexOf(q) + 1}</span>
                                        <span className="text-slate-300 text-sm leading-relaxed group-hover:text-white transition-colors">{q.clue}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h3 className="text-sm font-black text-blue-400 mb-4 uppercase flex items-center gap-2 tracking-widest">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            Down
                        </h3>
                        <div className="space-y-4">
                            {questions.filter(q => q.direction === 'down').map((q) => (
                                <div key={q.id} className="group cursor-pointer" onClick={() => inputRefs.current[`${q.row}-${q.col}`]?.focus()}>
                                    <div className="flex gap-3">
                                        <span className="font-black text-teal-500 text-sm">{questions.indexOf(q) + 1}</span>
                                        <span className="text-slate-300 text-sm leading-relaxed group-hover:text-white transition-colors">{q.clue}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 p-6 rounded-3xl border border-indigo-500/10 text-center">
                <p className="text-xs text-indigo-300 font-medium">Tip: Use arrow keys to navigate the grid manually.</p>
            </div>
        </div>
    </div>
  );
};

export default StudentSolve;
