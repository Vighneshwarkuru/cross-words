
import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import FacultyCreate from './pages/FacultyCreate';
import FacultyDashboard from './pages/FacultyDashboard';
import StudentSolve from './pages/StudentSolve';
import Success from './pages/Success';
import Home from './pages/Home';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-[#020617] text-slate-100 selection:bg-teal-500/30">
        {/* Navigation Bar */}
        <header className="border-b border-slate-800 bg-[#020617]/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center font-bold text-white">A</div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">
                AutoCross-Edu
              </span>
            </Link>
            <nav className="flex gap-6 text-sm font-medium">
              <Link to="/create" className="text-slate-400 hover:text-teal-400 transition-colors">Create Assessment</Link>
              <Link to="/dashboard" className="text-slate-400 hover:text-purple-400 transition-colors">Dashboard</Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<FacultyCreate />} />
            <Route path="/dashboard" element={<FacultyDashboard />} />
            <Route path="/solve/:id" element={<StudentSolve />} />
            <Route path="/success" element={<Success />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="py-8 border-t border-slate-800 text-center text-sm text-slate-500">
          <p>© 2024 AutoCross-Edu. AI-Powered Educational Assessment System.</p>
        </footer>
      </div>
    </Router>
  );
};

export default App;
