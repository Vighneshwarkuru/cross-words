
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../db';
import { Assessment, Response } from '../types';

const FacultyDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get('id');
  const [facultyName, setFacultyName] = useState('');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (assessmentId) {
      loadAssessment(assessmentId);
    }
  }, [assessmentId]);

  const loadAssessment = async (id: string) => {
    setLoading(true);
    const data = await db.getAssessment(id);
    if (data) {
      setSelectedAssessment(data.assessment);
      const resData = await db.getResponses(id);
      setResponses(resData);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    setLoading(true);
    const data = await db.getAssessmentsByFaculty(facultyName);
    setAssessments(data);
    setLoading(false);
  };

  const downloadCSV = () => {
    if (!responses.length || !selectedAssessment) return;
    
    const headers = ['Roll Number', 'Name', 'Score', 'Total Questions', 'Time Taken (s)', 'Submitted At'];
    const rows = responses.map(r => [
      r.roll_number,
      r.student_name || 'N/A',
      r.score,
      r.total_questions,
      r.time_taken,
      new Date(r.submitted_at).toLocaleString()
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `results_${selectedAssessment.title}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {!selectedAssessment && (
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-slate-900/40 p-6 border border-slate-800 rounded-2xl">
          <div className="flex-grow space-y-2">
              <label className="text-sm font-medium text-slate-400">Search by Faculty Name</label>
              <div className="flex gap-2">
                  <input 
                      className="flex-grow bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 outline-none"
                      placeholder="e.g. Dr. Alexander Wright"
                      value={facultyName}
                      onChange={(e) => setFacultyName(e.target.value)}
                  />
                  <button 
                      onClick={handleSearch}
                      className="bg-purple-600 hover:bg-purple-500 px-6 rounded-lg font-medium transition-colors"
                  >
                      Search
                  </button>
              </div>
          </div>
        </div>
      )}

      {assessments.length > 0 && !selectedAssessment && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assessments.map(a => (
                <div key={a.id} className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl hover:border-teal-500 transition-colors cursor-pointer group" onClick={() => loadAssessment(a.id)}>
                    <h3 className="font-bold text-lg mb-1 group-hover:text-teal-400 transition-colors">{a.title}</h3>
                    <p className="text-slate-400 text-sm mb-6">{a.subject} • {a.class_section || 'All Sections'}</p>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                        <span>Code: <span className="text-white font-mono">{a.id}</span></span>
                        <span className="text-teal-500">View Data →</span>
                    </div>
                </div>
            ))}
        </div>
      )}

      {selectedAssessment && (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/40 p-8 rounded-3xl border border-slate-800">
                <div className="space-y-2">
                    <button onClick={() => setSelectedAssessment(null)} className="text-xs font-bold text-purple-400 uppercase tracking-widest hover:underline mb-2 flex items-center gap-1">← Return to List</button>
                    <h1 className="text-4xl font-black text-white">{selectedAssessment.title}</h1>
                    <p className="text-slate-400 font-medium">{selectedAssessment.subject} • Faculty: {selectedAssessment.faculty_name}</p>
                </div>
                
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl text-center min-w-[200px] shadow-inner shadow-black/50 ring-1 ring-teal-500/20">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Student Access Code</p>
                    <div className="text-3xl font-mono font-black text-teal-400 tracking-widest uppercase mb-2">
                        {selectedAssessment.id}
                    </div>
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(selectedAssessment.id);
                            alert('Code copied to clipboard!');
                        }}
                        className="text-[10px] font-bold text-slate-500 hover:text-white transition-colors flex items-center gap-1 mx-auto"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                        Copy to share
                    </button>
                </div>
            </div>

            <div className="flex justify-between items-center px-2">
                <h3 className="text-xl font-bold text-slate-200">Submissions ({responses.length})</h3>
                <button 
                    onClick={downloadCSV}
                    className="bg-teal-600/20 text-teal-400 border border-teal-600/50 hover:bg-teal-600/40 px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Export results.csv
                </button>
            </div>

            <div className="overflow-x-auto rounded-[2rem] border border-slate-800 bg-slate-900/20 backdrop-blur-sm">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-950/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                            <th className="px-8 py-5">Roll No.</th>
                            <th className="px-8 py-5">Student</th>
                            <th className="px-8 py-5">Score</th>
                            <th className="px-8 py-5">Efficiency</th>
                            <th className="px-8 py-5">Time</th>
                            <th className="px-8 py-5">Timestamp</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {responses.length > 0 ? responses.map(r => (
                            <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-8 py-5 font-mono text-purple-400 font-bold">{r.roll_number}</td>
                                <td className="px-8 py-5 font-medium">{r.student_name || 'Anonymous'}</td>
                                <td className="px-8 py-5">
                                    <span className="font-black text-white">{r.score}</span>
                                    <span className="text-slate-600 font-bold"> / {r.total_questions}</span>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-teal-500" style={{ width: `${(r.score / r.total_questions) * 100}%` }}></div>
                                        </div>
                                        <span className="text-xs font-bold text-teal-400">{Math.round((r.score / r.total_questions) * 100)}%</span>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-slate-400 text-sm">{r.time_taken}s</td>
                                <td className="px-8 py-5 text-slate-500 text-[10px] font-mono">
                                    {new Date(r.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="px-8 py-16 text-center text-slate-500 font-medium italic">Waiting for students to join using code {selectedAssessment.id}...</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
};

export default FacultyDashboard;
