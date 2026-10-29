import React, { useState } from 'react';
import { Shield, Lock, User, Eye, EyeOff, Sparkles, KeyRound, ArrowRight } from 'lucide-react';
import { signInWithGoogle } from '../firebase';
import { 
  OfficerRole, 
  SUPER_ADMIN_CREDENTIAL, 
  getStoredOfficerCredentials, 
  verifyOfficerLogin 
} from '../utils/authCredentials';
import { AdminSession } from './AdminLoginModal';

interface AdminLoginCardProps {
  onLoginSuccess: (session: AdminSession) => void;
  onBackHome?: () => void;
}

export const AdminLoginCard: React.FC<AdminLoginCardProps> = ({
  onLoginSuccess,
  onBackHome,
}) => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedQuickAccount, setSelectedQuickAccount] = useState<string>('super_admin');

  const officerCreds = getStoredOfficerCredentials();

  const handleQuickSelect = (key: string) => {
    setSelectedQuickAccount(key);
    setErrorMessage(null);

    if (key === 'super_admin') {
      setAdminId(SUPER_ADMIN_CREDENTIAL.loginId);
      setPassword(SUPER_ADMIN_CREDENTIAL.password);
    } else {
      const match = officerCreds.find((c) => c.id === key);
      if (match) {
        setAdminId(match.loginId);
        setPassword(match.password);
      }
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      const matched = verifyOfficerLogin(adminId, password);
      if (matched) {
        const session: AdminSession = {
          adminId: matched.loginId,
          name: matched.officerName,
          role: matched.role,
          desk: matched.desk,
          authenticatedAt: new Date().toISOString(),
        };
        try {
          localStorage.setItem('pcb_admin_session', JSON.stringify(session));
        } catch {
          // ignore
        }
        setIsLoading(false);
        onLoginSuccess(session);
      } else {
        setIsLoading(false);
        setErrorMessage('Invalid ID or Password. Select an OIC set or check admin credentials.');
      }
    }, 200);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const result = await signInWithGoogle();
    setIsLoading(false);
    if (result.user) {
      const session: AdminSession = {
        adminId: result.user.email || 'google_admin',
        name: result.user.displayName || 'Authorized Officer',
        role: 'Super Admin',
        desk: 'Central Committee',
        authenticatedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem('pcb_admin_session', JSON.stringify(session));
      } catch {
        // ignore
      }
      onLoginSuccess(session);
    } else if (result.error) {
      setErrorMessage(result.error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {onBackHome && (
        <div className="flex items-center justify-between border-b border-cyan-950/40 pb-3">
          <button
            onClick={onBackHome}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition-colors cursor-pointer"
          >
            ← Back to Home
          </button>
          <span className="text-xs text-slate-400 font-mono">Official Admission Committee Access</span>
        </div>
      )}

      <div className="bg-[#0b1016] border border-cyan-800/60 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header banner */}
        <div className="p-6 border-b border-cyan-950/50 flex items-center justify-between bg-[#070b0e]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-outfit">
                Admission Committee & OIC Sign In
              </h2>
              <p className="text-xs text-slate-400">
                Panchayat College, Bargarh · SAMS Central Administration & Officer Desk
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Quick Select sets */}
          <div className="bg-[#070b0e] border border-cyan-900/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Select Login Set (2 Verifying Officers + 4 OIC Sets)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">1-Click Auto-Fill</span>
            </div>

            {/* Verifying Officer Section */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider block">
                Verifying Officers (Verification Officer Console)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickSelect('vo_desk_1')}
                  className={`p-2.5 rounded-lg text-left border transition-all cursor-pointer ${
                    selectedQuickAccount === 'vo_desk_1'
                      ? 'bg-amber-950/90 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                      : 'bg-[#05080b] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-white text-xs flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>VO Set 1 (Science & Comm)</span>
                  </div>
                  <div className="text-[11px] text-amber-300/80 font-mono mt-0.5">vo.desk1 (Pass: Verify@2026A)</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickSelect('vo_desk_2')}
                  className={`p-2.5 rounded-lg text-left border transition-all cursor-pointer ${
                    selectedQuickAccount === 'vo_desk_2'
                      ? 'bg-amber-950/90 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                      : 'bg-[#05080b] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-white text-xs flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>VO Set 2 (Arts & Social)</span>
                  </div>
                  <div className="text-[11px] text-amber-300/80 font-mono mt-0.5">vo.desk2 (Pass: Verify@2026B)</div>
                </button>
              </div>
            </div>

            {/* OIC Roll Number Section */}
            <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">
                OIC Roll Number Desks (Roll Number Allotment & Confirmation)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickSelect('oic_roll_1')}
                  className={`p-2.5 rounded-lg text-left border transition-all cursor-pointer ${
                    selectedQuickAccount === 'oic_roll_1'
                      ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                      : 'bg-[#05080b] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-white text-xs flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>OIC Roll No 1 (Science)</span>
                  </div>
                  <div className="text-[11px] text-emerald-300/80 font-mono mt-0.5">oic.rollno1 (RollNo@2026A)</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickSelect('oic_roll_2')}
                  className={`p-2.5 rounded-lg text-left border transition-all cursor-pointer ${
                    selectedQuickAccount === 'oic_roll_2'
                      ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                      : 'bg-[#05080b] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-white text-xs flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>OIC Roll No 2 (Arts/Comm)</span>
                  </div>
                  <div className="text-[11px] text-emerald-300/80 font-mono mt-0.5">oic.rollno2 (RollNo@2026B)</div>
                </button>
              </div>
            </div>

            {/* OIC Reporting & Admin Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => handleQuickSelect('super_admin')}
                className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                  selectedQuickAccount === 'super_admin'
                    ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                    : 'bg-[#05080b] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-white text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Central Super Admin</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">admin (Panchayat@2026)</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('oic_rep_1')}
                className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                  selectedQuickAccount === 'oic_rep_1'
                    ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                    : 'bg-[#05080b] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-white text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>OIC Reporting 1</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">oic.reporting1</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('oic_rep_2')}
                className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                  selectedQuickAccount === 'oic_rep_2'
                    ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                    : 'bg-[#05080b] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-white text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>OIC Reporting 2</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">oic.reporting2</div>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Staff Login ID / Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="e.g. admin or oic.reporting1"
                  className="w-full bg-[#070b0e] border border-cyan-900/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your security password"
                  className="w-full bg-[#070b0e] border border-cyan-900/60 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isLoading ? 'Verifying Credentials...' : 'Sign In to Official Console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Google Sign in */}
          <div className="pt-4 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Sign in with College Google Account (@panchayatcollege.ac.in)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
