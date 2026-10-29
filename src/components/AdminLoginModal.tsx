import React, { useState } from 'react';
import { X, Shield, Lock, User, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles, UserCheck } from 'lucide-react';
import { signInWithGoogle } from '../firebase';
import { 
  OfficerRole, 
  OfficerCredential, 
  SUPER_ADMIN_CREDENTIAL, 
  getStoredOfficerCredentials, 
  verifyOfficerLogin 
} from '../utils/authCredentials';

export interface AdminSession {
  adminId: string;
  name: string;
  role: OfficerRole;
  desk?: string;
  authenticatedAt: string;
}

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: AdminSession) => void;
}

export const DEFAULT_ADMIN_ID = SUPER_ADMIN_CREDENTIAL.loginId;
export const DEFAULT_ADMIN_PASSWORD = SUPER_ADMIN_CREDENTIAL.password;

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Quick Account Picker
  const [selectedQuickAccount, setSelectedQuickAccount] = useState<string>('super_admin');

  if (!isOpen) return null;

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
        } catch (e) {
          // ignore
        }
        setIsLoading(false);
        onLoginSuccess(session);
        onClose();
      } else {
        setIsLoading(false);
        setErrorMessage('Invalid ID or Password. Select an OIC set or check admin credentials.');
      }
    }, 300);
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
      localStorage.setItem('pcb_admin_session', JSON.stringify(session));
      onLoginSuccess(session);
      onClose();
    } else if (result.error) {
      setErrorMessage(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-[#0b1016] border border-cyan-800/60 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-cyan-950/50 flex items-center justify-between bg-[#070b0e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-outfit">
                Admission Committee & OIC Sign In
              </h2>
              <p className="text-[11px] text-slate-400">
                Panchayat College, Bargarh · Official Staff Portal
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">

          {/* Quick Account Selector for Super Admin, Verifying Officers, and OIC Sets */}
          <div className="bg-[#070b0e] border border-cyan-900/50 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Select Login Set (2 Verifying Officers + 4 OIC Sets)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">1-Click Auto-Fill</span>
            </div>

            {/* Verifying Officer Section */}
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider block">
                Verifying Officers (For Verification Console)
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* VO Set 1 */}
                <button
                  type="button"
                  onClick={() => handleQuickSelect('vo_desk_1')}
                  className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                    selectedQuickAccount === 'vo_desk_1'
                      ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                      : 'bg-[#05080b] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-white text-[11px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>VO Set 1 (Science & Comm)</span>
                  </div>
                  <div className="text-[10px] text-amber-300/80 font-mono mt-0.5 truncate">
                    vo.desk1 (Pass: Verify@2026A)
                  </div>
                </button>

                {/* VO Set 2 */}
                <button
                  type="button"
                  onClick={() => handleQuickSelect('vo_desk_2')}
                  className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                    selectedQuickAccount === 'vo_desk_2'
                      ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                      : 'bg-[#05080b] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-white text-[11px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>VO Set 2 (Arts & Social)</span>
                  </div>
                  <div className="text-[10px] text-amber-300/80 font-mono mt-0.5 truncate">
                    vo.desk2 (Pass: Verify@2026B)
                  </div>
                </button>
              </div>
            </div>

            {/* OIC Roll Number Section */}
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">
                OIC Roll Number Desks
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* OIC Roll No Set 1 */}
                <button
                  type="button"
                  onClick={() => handleQuickSelect('oic_roll_1')}
                  className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                    selectedQuickAccount === 'oic_roll_1'
                      ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'bg-[#05080b] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-white text-[11px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>OIC Roll No 1 (Science)</span>
                  </div>
                  <div className="text-[10px] text-emerald-300/80 font-mono mt-0.5 truncate">
                    oic.rollno1 (RollNo@2026A)
                  </div>
                </button>

                {/* OIC Roll No Set 2 */}
                <button
                  type="button"
                  onClick={() => handleQuickSelect('oic_roll_2')}
                  className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                    selectedQuickAccount === 'oic_roll_2'
                      ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'bg-[#05080b] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-white text-[11px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>OIC Roll No 2 (Arts/Comm)</span>
                  </div>
                  <div className="text-[10px] text-emerald-300/80 font-mono mt-0.5 truncate">
                    oic.rollno2 (RollNo@2026B)
                  </div>
                </button>
              </div>
            </div>

            {/* OIC Reporting Section */}
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider block">
                OIC Reporting Desks
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* OIC Reporting Set 1 */}
                <button
                  type="button"
                  onClick={() => handleQuickSelect('oic_rep_1')}
                  className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                    selectedQuickAccount === 'oic_rep_1'
                      ? 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                      : 'bg-[#05080b] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-white text-[11px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>Set 1: OIC Reporting (Desk 1)</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                    oic.reporting1 (Report@2026A)
                  </div>
                </button>

                {/* OIC Reporting Set 2 */}
                <button
                  type="button"
                  onClick={() => handleQuickSelect('oic_rep_2')}
                  className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                    selectedQuickAccount === 'oic_rep_2'
                      ? 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                      : 'bg-[#05080b] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-white text-[11px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>Set 2: OIC Reporting (Desk 2)</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                    oic.reporting2 (Report@2026B)
                  </div>
                </button>
              </div>
            </div>

            {/* Super Admin option */}
            <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => handleQuickSelect('super_admin')}
                className={`text-[11px] font-mono px-2 py-1 rounded transition-colors ${
                  selectedQuickAccount === 'super_admin'
                    ? 'bg-slate-800 text-cyan-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Super Admin Account (admin / Panchayat@2026)
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-950/60 border border-red-500/40 rounded-xl p-3 flex items-center gap-2 text-xs text-red-300 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Staff / Officer ID
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="e.g. oic.reporting1@panchayatcollege.ac.in"
                  className="w-full bg-[#070b0e] border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#070b0e] border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isLoading ? 'Verifying Account...' : 'Sign In as Admission Officer'}</span>
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
              <span className="bg-[#0b1016] px-2 text-slate-500">Or use Admin Google Account</span>
            </div>
          </div>

          {/* Google Sign-in alternative */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-[#070b0e] hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-200 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Sign In with Committee Google Email</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-[#070b0e] border-t border-cyan-950/40 text-center text-[10px] text-slate-500">
          Admin and OIC credentials can be edited in the Admin Console under "Officer Credentials".
        </div>
      </div>
    </div>
  );
};
