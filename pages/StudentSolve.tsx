
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
    const [focusedCell, setFocusedCell] = useState<{ r: number, c: number } | null>(null);

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
        <div className="flex flex-col items-center justify-center py-40 animate-fade-in">
            <div className="w-16 h-16 border-4 border-slate-800 rounded-full mb-6 relative">
                <div className="absolute inset-0 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-400 font-mono uppercase tracking-widest text-sm animate-pulse">Decrypting Assessment...</p>
        </div>
    );

    if (error) return (
        <div className="max-w-md mx-auto text-center py-20 px-6">
            <div className="bg-red-500/10 border border-red-500/50 p-10 rounded-3xl animate-slide-up">
                <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Access Denied</h2>
                <p className="text-red-300/80 mb-8 leading-relaxed">{error}</p>
                <button onClick={() => navigate('/')} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-red-500/20">
                    Return Home
                </button>
            </div>
        </div>
    );

    if (!isStarted) {
        return (
            <div className="max-w-md mx-auto glass border border-slate-700 p-10 rounded-[2.5rem] shadow-2xl mt-12 animate-slide-up">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black mb-2 leading-tight">{assessment?.title}</h1>
                    <span className="inline-block px-3 py-1 rounded-full bg-teal-500/10 text-teal-400 text-xs font-bold uppercase tracking-widest border border-teal-500/20">{assessment?.subject}</span>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Roll Number</label>
                        <input
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono text-lg"
                            placeholder="e.g. 21BCS1042"
                            value={rollNumber}
                            onChange={(e) => setRollNumber(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Student Name</label>
                        <input
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-teal-500 transition-all text-lg"
                            placeholder="Your Full Name"
                            value={studentName}
                            onChange={(e) => setStudentName(e.target.value)}
                        />
                    </div>
                    <div className="pt-4">
                        <button
                            onClick={handleStart}
                            className="w-full bg-gradient-to-r from-purple-600 to-teal-600 hover:brightness-110 text-white font-black py-5 rounded-2xl shadow-xl transition-all transform hover:-translate-y-1 active:scale-[0.98] text-lg"
                        >
                            START ASSESSMENT
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-8 items-start animate-fade-in">
            {/* Puzzle Board */}
            <div className="flex-grow w-full glass p-6 md:p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-auto relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-bl-[100px] pointer-events-none" />

                <div
                    className="grid gap-1.5 mx-auto relative z-10"
                    style={{
                        gridTemplateColumns: `repeat(${gridSize.cols}, minmax(36px, 1fr))`,
                        width: 'fit-content'
                    }}
                >
                    {gridData.map((row, r) => row.map((cell, c) => {
                        const isInput = cell !== ' ';
                        const qAcross = questions.find(q => q.row === r && q.col === c && q.direction === 'across');
                        const qDown = questions.find(q => q.row === r && q.col === c && q.direction === 'down');
                        const qNum = qAcross || qDown ? questions.indexOf(qAcross || qDown!) + 1 : null;
                        const isFocused = focusedCell?.r === r && focusedCell?.c === c;

                        return (
                            <div
                                key={`${r}-${c}`}
                                className={`relative w-9 h-9 md:w-12 md:h-12 border rounded-xl transition-all duration-200 ${isInput
                                        ? isFocused
                                            ? 'bg-slate-800 border-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.3)] scale-110 z-20'
                                            : 'bg-slate-950/80 border-slate-800'
                                        : 'bg-transparent border-transparent'
                                    }`}
                            >
                                {qNum && <span className="absolute -top-1 -left-1 text-[10px] text-teal-400 font-black leading-none pointer-events-none select-none z-10 bg-slate-900 px-1 rounded-full border border-slate-800">{qNum}</span>}
                                {isInput && (
                                    <input
                                        ref={el => inputRefs.current[`${r}-${c}`] = el}
                                        className="w-full h-full text-center bg-transparent text-slate-100 font-bold text-lg md:text-2xl outline-none uppercase caret-teal-500 pb-1"
                                        maxLength={1}
                                        value={cell === '_' ? '' : cell}
                                        onFocus={() => setFocusedCell({ r, c })}
                                        onBlur={() => setFocusedCell(null)}
                                        onChange={(e) => handleCellChange(r, c, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(r, c, e)}
                                    />
                                )}
                            </div>
                        );
                    }))}
                </div>

                <div className="mt-16 flex flex-col items-center gap-6">
                    <button
                        onClick={handleSubmit}
                        className="group relative px-12 py-4 bg-slate-100 text-slate-950 font-black rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.4)] hover:scale-105 transition-all overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <span className="relative z-10 flex items-center gap-3">
                            SUBMIT ANSWERS
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </span>
                    </button>
                </div>
            </div>

            {/* Clues Panel */}
            <div className="lg:w-96 w-full space-y-6 lg:sticky lg:top-8 animate-slide-up animate-delay-200">
                <div className="glass p-8 rounded-[2rem] border border-slate-800 max-h-[85vh] overflow-y-auto scrollbar-thin">
                    <div className="flex items-center justify-between mb-8 sticky top-0 bg-slate-900/95 backdrop-blur-xl p-2 -m-2 z-10 rounded-xl border-b border-white/5">
                        <h2 className="text-xl font-black text-white tracking-tight">Clues</h2>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live</span>
                        </div>
                    </div>

                    <div className="space-y-10">
                        <section>
                            <h3 className="text-xs font-black text-purple-400 mb-6 uppercase flex items-center gap-3 tracking-widest border-b border-purple-500/20 pb-2">
                                <span className="bg-purple-500/20 p-1.5 rounded-lg"><div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div></span>
                                Across
                            </h3>
                            <div className="space-y-3">
                                {questions.filter(q => q.direction === 'across').map((q) => (
                                    <div key={q.id} className="group cursor-pointer p-3 hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/5" onClick={() => inputRefs.current[`${q.row}-${q.col}`]?.focus()}>
                                        <div className="flex gap-4">
                                            <span className="font-black text-slate-500 group-hover:text-purple-400 transition-colors text-sm w-4">{questions.indexOf(q) + 1}</span>
                                            <span className="text-slate-300 text-sm font-medium leading-relaxed group-hover:text-white transition-colors">{q.clue}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h3 className="text-xs font-black text-teal-400 mb-6 uppercase flex items-center gap-3 tracking-widest border-b border-teal-500/20 pb-2">
                                <span className="bg-teal-500/20 p-1.5 rounded-lg"><div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div></span>
                                Down
                            </h3>
                            <div className="space-y-3">
                                {questions.filter(q => q.direction === 'down').map((q) => (
                                    <div key={q.id} className="group cursor-pointer p-3 hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/5" onClick={() => inputRefs.current[`${q.row}-${q.col}`]?.focus()}>
                                        <div className="flex gap-4">
                                            <span className="font-black text-slate-500 group-hover:text-teal-400 transition-colors text-sm w-4">{questions.indexOf(q) + 1}</span>
                                            <span className="text-slate-300 text-sm font-medium leading-relaxed group-hover:text-white transition-colors">{q.clue}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentSolve;
