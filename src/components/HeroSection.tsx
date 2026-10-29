import React, { useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  onSearchBarcode: (query: string) => void;
  onSelectTab: (tab: 'home' | 'selection' | 'spot' | 'guide') => void;
  onOpenTracker: () => void;
  onOpenAdmin: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSearchBarcode,
  onSelectTab,
  onOpenTracker,
  onOpenAdmin,
}) => {
  const [searchInput, setSearchInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearchBarcode(searchInput.trim());
    }
  };

  return (
    <div className="relative overflow-hidden bg-[#070b0e] border-b border-cyan-950/30">
      {/* Background visual inspiration from collegiate nature / reference photo */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity filter saturate-50 pointer-events-none"
        style={{
          backgroundImage: `url('/assets/aistudio/image_ca2aeab1.png')`,
          backgroundPosition: 'top center'
        }}
      />
      {/* Gradient vignette for contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070b0e]/85 via-[#070b0e]/95 to-[#070b0e]" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-16 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Main Hero Column */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
              <span>Academic Session 2026–2027</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-400">SAMS Odisha Affiliated</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white font-outfit uppercase">
                UG e-Admission <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-300 to-cyan-500 drop-shadow-[0_0_25px_rgba(6,182,212,0.4)]">
                  Panchayat College
                </span>
              </h1>
              <p className="text-slate-300 text-sm sm:text-base max-w-2xl font-normal leading-relaxed pt-1">
                Official centralized digital admission portal for Panchayat Autonomous Degree College, Bargarh. 
                Verify merit standing, track Selection & Spot rounds, inspect live seat vacancies, and securely upload verification documents.
              </p>
            </div>

            {/* Fast Barcode / Name Search Bar */}
            <form onSubmit={handleSubmit} className="pt-2 max-w-xl">
              <div className="relative flex items-center bg-[#0d131a] rounded-xl border border-cyan-800/40 p-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.5)] focus-within:border-cyan-400 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all">
                <Search className="w-5 h-5 text-cyan-400 ml-3 shrink-0" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Enter SAMS Barcode (e.g. 26D109482), Name, or Mobile..."
                  className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold text-[#070b0e] bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 rounded-lg transition-all flex items-center gap-1.5 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
                >
                  <span>Track Status</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>

          {/* Right Side Step Numbers Tracker (Direct homage to 01-05 indicator in photo) */}
          <div className="lg:col-span-4 lg:pl-6 border-l border-cyan-950/40 hidden lg:block">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
              e-Admission Milestones
            </div>
            <div className="space-y-4">
              {[
                { num: '01', title: 'Phase-I Selection Merit List', status: 'Completed', active: false },
                { num: '02', title: 'Phase-II Merit & Upgrade', status: 'Completed', active: false },
                { num: '03', title: 'Physical Document Verification', status: 'Ongoing Window', active: true },
                { num: '04', title: 'Spot Admission & Registration', status: 'Open for Vacancy', active: false },
                { num: '05', title: 'Final Roll Allocation & Commencement', status: 'Upcoming', active: false },
              ].map((step) => (
                <div 
                  key={step.num}
                  className={`flex items-start gap-4 p-2.5 rounded-lg transition-all ${
                    step.active 
                      ? 'bg-cyan-950/30 border border-cyan-500/30 text-white' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className={`text-base font-extrabold font-mono tabular-nums ${step.active ? 'text-cyan-400' : 'text-slate-600'}`}>
                    {step.num}
                  </span>
                  <div className="flex-1">
                    <div className="text-xs font-semibold">{step.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{step.status}</div>
                  </div>
                  {step.active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] mt-1.5" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
