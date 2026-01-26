
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const [assessmentCode, setAssessmentCode] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (assessmentCode.trim()) {
      navigate(`/solve/${assessmentCode.trim()}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="max-w-4xl w-full">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
          Redefining <span className="bg-gradient-to-r from-purple-500 via-gold-400 to-teal-400 bg-clip-text text-transparent">Assessment</span> through AI.
        </h1>
        <p className="text-lg text-slate-400 mb-10 leading-relaxed max-w-2xl mx-auto">
          The ultimate crossword-based learning platform. Faculty generate puzzles in seconds; students solve and learn in real-time.
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Faculty Card */}
          <Link to="/create" className="group p-8 bg-slate-900/40 border border-slate-800 rounded-3xl hover:border-purple-500 transition-all text-left flex flex-col h-full">
            <div className="w-12 h-12 bg-purple-900/30 text-purple-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-slate-100">Faculty Portal</h3>
            <p className="text-slate-400 text-sm flex-grow">Generate instant crossword assessments from your lecture notes or specific topics using Gemini AI.</p>
            <div className="mt-6 text-purple-400 font-medium group-hover:translate-x-1 transition-transform">Create Puzzle →</div>
          </Link>

          {/* Student Card */}
          <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-3xl text-left flex flex-col h-full ring-2 ring-teal-500/20">
            <div className="w-12 h-12 bg-teal-900/30 text-teal-400 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-slate-100">Student Join</h3>
            <p className="text-slate-400 text-sm mb-6">Have an assessment code? Enter it below to start solving your puzzle immediately.</p>
            <form onSubmit={handleJoin} className="space-y-3 mt-auto">
              <input 
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500 transition-all text-center font-mono tracking-widest uppercase"
                placeholder="ENTER CODE"
                value={assessmentCode}
                onChange={(e) => setAssessmentCode(e.target.value)}
              />
              <button className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg">
                Join Assessment
              </button>
            </form>
          </div>

          {/* Analytics Card */}
          <Link to="/dashboard" className="group p-8 bg-slate-900/40 border border-slate-800 rounded-3xl hover:border-blue-500 transition-all text-left flex flex-col h-full">
            <div className="w-12 h-12 bg-blue-900/30 text-blue-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-slate-100">Analytics</h3>
            <p className="text-slate-400 text-sm flex-grow">Track student progress, view detailed scores, and export results for your grading system.</p>
            <div className="mt-6 text-blue-400 font-medium group-hover:translate-x-1 transition-transform">View Results →</div>
          </Link>
        </div>
      </div>

      <div className="mt-12 w-full max-w-4xl opacity-20 pointer-events-none">
        <div className="grid grid-cols-12 grid-rows-6 gap-2 aspect-[2/1] border-2 border-slate-800 rounded-2xl p-4">
            {[...Array(72)].map((_, i) => (
                <div key={i} className={`rounded-md ${Math.random() > 0.8 ? 'bg-slate-700' : 'bg-transparent'}`}></div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
