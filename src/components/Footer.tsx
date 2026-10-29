import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#05080b] border-t border-cyan-950/40 text-xs text-slate-500 py-10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <div className="text-white font-semibold font-outfit text-sm">
            Panchayat Autonomous College, Bargarh (Baragada), Odisha
          </div>
          <p className="text-slate-500">
            Affiliated to Sambalpur University · Accredited by NAAC · Department of Higher Education (DHE) Odisha
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-slate-400">
          <a href="#home" className="hover:text-cyan-400 transition-colors">Home</a>
          <a href="#selection" className="hover:text-cyan-400 transition-colors">Selection Merit</a>
          <a href="#spot" className="hover:text-cyan-400 transition-colors">Spot Admissions</a>
          <a href="https://samsodisha.gov.in" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">SAMS Odisha Portal</a>
          <span className="text-slate-600">·</span>
          <span>Academic Session 2026–27</span>
        </div>
      </div>
    </footer>
  );
};
