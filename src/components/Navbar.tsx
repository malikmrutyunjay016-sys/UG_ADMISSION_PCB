import React from 'react';
import { User } from '../firebase';
import { ShieldCheck, LogOut, KeyRound } from 'lucide-react';
import { AdminSession } from './AdminLoginModal';

export type NavTab = 'home' | 'selection' | 'spot' | 'guide' | 'admin' | 'oic';

interface NavbarProps {
  currentUser: User | null;
  isAdmin: boolean;
  adminSession?: AdminSession | null;
  canAccessOicReporting: boolean;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenTracker: () => void;
  onOpenAdmin: () => void;
  onOpenAdminLogin: () => void;
  onOpenOicReporting: () => void;
  onAdminLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  isAdmin,
  adminSession,
  activeTab,
  setActiveTab,
  onOpenTracker,
  onAdminLogout,
}) => {

  return (
    <header className="sticky top-0 z-40 bg-[#070b0e]/95 backdrop-blur-md border-b border-cyan-950/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <a 
            href="#home" 
            onClick={(e) => { e.preventDefault(); setActiveTab('home'); }}
            className="flex items-center gap-2.5 text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap hover:text-cyan-400 transition-colors"
          >
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-600 flex items-center justify-center text-[#070b0e] font-extrabold text-sm shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              PC
            </span>
            <span className="flex flex-col">
              <span className="leading-none font-outfit text-white">Panchayat College</span>
              <span className="text-[10px] tracking-widest text-cyan-400 font-medium uppercase mt-0.5">Bargarh · UG e-Admission</span>
            </span>
          </a>
        </div>

        {/* Zone 2: navigation links (All pages in menu like Selection Round) */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-5 text-sm font-medium">
          <button
            onClick={() => setActiveTab('home')}
            className={`whitespace-nowrap transition-colors py-1 border-b-2 cursor-pointer ${
              activeTab === 'home' 
                ? 'border-cyan-400 text-cyan-400 font-semibold' 
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => setActiveTab('selection')}
            className={`whitespace-nowrap transition-colors py-1 border-b-2 cursor-pointer ${
              activeTab === 'selection' 
                ? 'border-cyan-400 text-cyan-400 font-semibold' 
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
          >
            Selection Rounds
          </button>
          <button
            onClick={() => setActiveTab('spot')}
            className={`whitespace-nowrap transition-colors py-1 border-b-2 cursor-pointer ${
              activeTab === 'spot' 
                ? 'border-cyan-400 text-cyan-400 font-semibold' 
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
          >
            Spot & Waiting
          </button>

          {/* OIC Reporting Console as a page in menu */}
          <button
            onClick={() => setActiveTab('oic')}
            className={`whitespace-nowrap transition-colors py-1 border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'oic' 
                ? 'border-cyan-400 text-cyan-400 font-semibold' 
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>OIC Reporting Console</span>
          </button>

          {/* Admin Console as a page in menu */}
          <button
            onClick={() => setActiveTab('admin')}
            className={`whitespace-nowrap transition-colors py-1 border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'admin' 
                ? 'border-cyan-400 text-cyan-400 font-semibold' 
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Admin Console</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`whitespace-nowrap transition-colors py-1 border-b-2 cursor-pointer ${
              activeTab === 'guide' 
                ? 'border-cyan-400 text-cyan-400 font-semibold' 
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
          >
            Admission Guide
          </button>
        </nav>

        {/* Zone 3: session status or quick sign in */}
        <div className="flex items-center gap-2.5 shrink-0">
          {adminSession || isAdmin ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('admin')}
                className={`hidden sm:flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-cyan-500/40'
                }`}
                title="View Admin Central Console"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="truncate max-w-[110px]">{adminSession?.adminId || currentUser?.email || 'Admin'}</span>
              </button>

              {onAdminLogout && (
                <button
                  onClick={onAdminLogout}
                  title="Log out of session"
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('admin')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900/60 transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(6,182,212,0.15)] whitespace-nowrap cursor-pointer hover:border-cyan-400"
            >
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>Officer Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile subnav */}
      <div className="md:hidden flex items-center px-4 py-2 bg-[#05080b] border-t border-slate-800 text-xs overflow-x-auto gap-4">
        <button
          onClick={() => setActiveTab('home')}
          className={`whitespace-nowrap px-2 py-1 ${activeTab === 'home' ? 'text-cyan-400 font-semibold' : 'text-slate-400'}`}
        >
          Home
        </button>
        <button
          onClick={() => setActiveTab('selection')}
          className={`whitespace-nowrap px-2 py-1 ${activeTab === 'selection' ? 'text-cyan-400 font-semibold' : 'text-slate-400'}`}
        >
          Selection Rounds
        </button>
        <button
          onClick={() => setActiveTab('spot')}
          className={`whitespace-nowrap px-2 py-1 ${activeTab === 'spot' ? 'text-cyan-400 font-semibold' : 'text-slate-400'}`}
        >
          Spot & Waiting
        </button>
        <button
          onClick={() => setActiveTab('oic')}
          className={`whitespace-nowrap px-2.5 py-1 text-cyan-300 font-semibold bg-cyan-950/80 border border-cyan-500/40 rounded-lg flex items-center gap-1 shrink-0 ${activeTab === 'oic' ? 'ring-1 ring-cyan-400 text-cyan-200' : ''}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>OIC Reporting</span>
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`whitespace-nowrap px-2 py-1 ${activeTab === 'admin' ? 'text-cyan-400 font-semibold' : 'text-slate-400'}`}
        >
          Admin Console
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`whitespace-nowrap px-2 py-1 ${activeTab === 'guide' ? 'text-cyan-400 font-semibold' : 'text-slate-400'}`}
        >
          Guide
        </button>
      </div>
    </header>
  );
};
