import React, { useState } from 'react';
import { MeritRecord, RoundType, StreamType, CandidateStatus } from '../types/admission';
import { parseExcelFile, downloadSampleTemplate, exportCandidatesToExcel } from '../utils/excelParser';
import { User } from '../firebase';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Edit3, 
  RefreshCw,
  Shield,
  ShieldCheck,
  Layers,
  Search,
  KeyRound, 
  Lock, 
  LogOut,
  Eye,
  EyeOff,
  UserCheck,
  Save,
  Check,
  Copy,
  Download
} from 'lucide-react';

import { AdminSession, DEFAULT_ADMIN_ID, DEFAULT_ADMIN_PASSWORD } from './AdminLoginModal';
import { 
  OfficerCredential, 
  OfficerRole,
  getStoredOfficerCredentials, 
  saveOfficerCredentials, 
  resetOfficerCredentialsToDefault,
  SUPER_ADMIN_CREDENTIAL 
} from '../utils/authCredentials';

interface AdminPortalProps {
  isOpen?: boolean;
  onClose?: () => void;
  currentUser: User | null;
  isAdmin: boolean;
  adminSession?: AdminSession | null;
  onAdminLogout?: () => void;
  onOpenLoginModal?: () => void;
  onOpenOicReporting?: () => void;
  records: MeritRecord[];
  onAddRecords: (newRecords: MeritRecord[], replaceExisting?: boolean) => Promise<void>;
  onUpdateRecord: (updated: MeritRecord) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  onResetSeedData: () => Promise<void>;
  onCleanDuplicates?: () => Promise<{ cleanedCount: number; totalRemaining: number }>;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isAdmin,
  adminSession,
  onAdminLogout,
  onOpenLoginModal,
  onOpenOicReporting,
  records,
  onAddRecords,
  onUpdateRecord,
  onDeleteRecord,
  onResetSeedData,
  onCleanDuplicates,
}) => {
  // Navigation within Admin Console: 'merit' | 'officers'
  const [activeAdminTab, setActiveAdminTab] = useState<'merit' | 'officers'>('merit');

  // Excel & Merit State
  const [targetRound, setTargetRound] = useState<RoundType>('selection_round_1');
  const [syncMode, setSyncMode] = useState<'replace' | 'merge'>('replace');
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<{ candidates: MeritRecord[]; rawCount: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [reflectedOicInfo, setReflectedOicInfo] = useState<{ count: number; roundName: string } | null>(null);

  // Manual Add Form State (10 fields)
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualAdmissionDate, setManualAdmissionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualMobile, setManualMobile] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualBoardName, setManualBoardName] = useState('CHSE, Odisha');
  const [manualStream, setManualStream] = useState<StreamType>('Science');
  const [manualMajorSubject, setManualMajorSubject] = useState('Physics');
  const [manualPercentage, setManualPercentage] = useState('85.5');
  const [manualSocialCategory, setManualSocialCategory] = useState('GEN');
  const [manualSelectionCategory, setManualSelectionCategory] = useState('UR');
  const [manualRank, setManualRank] = useState('1');
  const [manualStatus, setManualStatus] = useState<CandidateStatus>('Selected');

  // Candidate search within admin
  const [adminSearch, setAdminSearch] = useState('');

  // -------------------------------------------------------------
  // OIC Login Credentials State (4 Sets: OIC reporting, OIC roll no)
  // -------------------------------------------------------------
  const [officerCredentials, setOfficerCredentials] = useState<OfficerCredential[]>(() => getStoredOfficerCredentials());
  const [editingOfficer, setEditingOfficer] = useState<OfficerCredential | null>(null);
  const [showAddOfficerModal, setShowAddOfficerModal] = useState(false);
  const [visiblePasswordIds, setVisiblePasswordIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [officerSuccessMessage, setOfficerSuccessMessage] = useState<string | null>(null);

  // Form for New / Edited Officer
  const [formOfficerName, setFormOfficerName] = useState('');
  const [formLoginId, setFormLoginId] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formDesk, setFormDesk] = useState('');
  const [formRole, setFormRole] = useState<OfficerRole>('OIC reporting');

  if (isOpen === false) return null;

  // -------------------------------------------------------------
  // Excel File Handling
  // -------------------------------------------------------------
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);
    setParseError(null);
    setParsedPreview(null);
    setReflectedOicInfo(null);

    try {
      const result = await parseExcelFile(selectedFile, targetRound);
      setParsedPreview(result);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Error reading spreadsheet');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedPreview || parsedPreview.candidates.length === 0) return;
    setIsSaving(true);
    setParseError(null);
    try {
      const isSelectionRound = targetRound === 'selection_round_1' || targetRound === 'selection_round_2';
      
      // Ensure all candidates inherit the target round and proper status for reporting
      const candidatesToPublish: MeritRecord[] = parsedPreview.candidates.map((c) => ({
        ...c,
        roundType: targetRound,
        status: c.status || (isSelectionRound ? 'Selected' : 'Spot Eligible'),
        updatedAt: new Date().toISOString()
      }));

      // Pass syncMode === 'replace' to ensure zero duplicate records
      await onAddRecords(candidatesToPublish, syncMode === 'replace');
      
      const roundName = targetRound.replace(/_/g, ' ').toUpperCase();
      setSuccessMessage(
        `Successfully synced ${candidatesToPublish.length} clean student records to ${roundName}! All data is live with 0 duplicates and reflected in the OIC Reporting Console.`
      );
      setReflectedOicInfo({
        count: candidatesToPublish.length,
        roundName
      });

      setFile(null);
      setParsedPreview(null);

      // Seamlessly switch to OIC Reporting Console so the newly reflected records appear
      if (onOpenOicReporting) {
        onOpenOicReporting();
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to save to database');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerCleanDuplicates = async () => {
    if (!onCleanDuplicates) return;
    setIsCleaningDuplicates(true);
    setParseError(null);
    try {
      const res = await onCleanDuplicates();
      setSuccessMessage(`Deduplication complete! Purged ${res.cleanedCount} obsolete/duplicate records from database. Exactly ${res.totalRemaining} unique student records are now active.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to clean duplicates');
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim() || !manualName.trim()) {
      alert('Please provide at least Barcode and Student Name.');
      return;
    }

    const newCandidate: MeritRecord = {
      id: `manual_${manualBarcode.trim()}_${Date.now()}`,
      barcodeNumber: manualBarcode.trim().toUpperCase(),
      applicantName: manualName.trim(),
      name: manualName.trim(),
      admissionDate: manualAdmissionDate.trim() || new Date().toISOString().split('T')[0],
      percentage: parseFloat(manualPercentage) || 80.0,
      socialCategory: manualSocialCategory.toUpperCase(),
      selectionCategory: manualSelectionCategory.toUpperCase(),
      mobileNumber: manualMobile.trim() || '9800000000',
      mobile: manualMobile.trim() || '9800000000',
      boardName: manualBoardName.trim() || 'CHSE, Odisha',
      stream: manualStream,
      majorSubject: manualMajorSubject.trim(),
      subject: manualMajorSubject.trim(),
      roundType: targetRound,
      category: manualSocialCategory.toUpperCase(),
      email: manualEmail.trim() || `${manualName.toLowerCase().replace(/\s+/g, '.')}@admission.in`,
      rank: parseInt(manualRank, 10) || 1,
      status: manualStatus,
      reportingDate: manualAdmissionDate.trim() || '2026-11-06',
      reportingTime: '10:00 AM - 01:00 PM',
      notes: 'Manually added by admission officer.',
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      await onAddRecords([newCandidate]);
      setShowManualForm(false);
      setSuccessMessage(`Candidate ${manualName} successfully added!`);
      // Reset
      setManualBarcode('');
      setManualName('');
      setManualMobile('');
      setManualEmail('');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add candidate');
    } finally {
      setIsSaving(false);
    }
  };

  // -------------------------------------------------------------
  // Officer Credentials Actions
  // -------------------------------------------------------------
  const handleOpenEditOfficer = (officer: OfficerCredential) => {
    setEditingOfficer(officer);
    setFormOfficerName(officer.officerName);
    setFormLoginId(officer.loginId);
    setFormPassword(officer.password);
    setFormDesk(officer.desk);
    setFormRole(officer.role);
  };

  const handleSaveEditedOfficer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOfficer) return;

    const updatedList = officerCredentials.map((item) => {
      if (item.id === editingOfficer.id) {
        return {
          ...item,
          officerName: formOfficerName.trim(),
          loginId: formLoginId.trim(),
          password: formPassword.trim(),
          desk: formDesk.trim(),
          role: formRole,
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });

    setOfficerCredentials(updatedList);
    saveOfficerCredentials(updatedList);
    setEditingOfficer(null);
    setOfficerSuccessMessage(`Updated credentials for "${formOfficerName}" (${formRole}) successfully!`);
    setTimeout(() => setOfficerSuccessMessage(null), 3500);
  };

  const handleToggleOfficerActive = (id: string) => {
    const updatedList = officerCredentials.map((item) => {
      if (item.id === id) {
        return { ...item, active: !item.active, updatedAt: new Date().toISOString() };
      }
      return item;
    });
    setOfficerCredentials(updatedList);
    saveOfficerCredentials(updatedList);
  };

  const handleResetToDefaultOfficerSets = () => {
    if (window.confirm('Reset all 4 OIC credentials sets back to official defaults?')) {
      const defaults = resetOfficerCredentialsToDefault();
      setOfficerCredentials(defaults);
      setOfficerSuccessMessage('Reset all 4 OIC reporting and roll no sets to default credentials.');
      setTimeout(() => setOfficerSuccessMessage(null), 3500);
    }
  };

  const handleCopyCredentials = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswordIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredAdminRecords = records.filter((r) => {
    if (adminSearch.trim()) {
      const q = adminSearch.toLowerCase().trim();
      return (
        r.barcodeNumber.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.mobile.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn space-y-6">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between border-b border-cyan-950/40 pb-3">
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition-colors cursor-pointer"
          >
            ← Back to Home
          </button>
        )}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">Panchayat College Central Administration</span>
          {onOpenOicReporting && (
            <button
              onClick={onOpenOicReporting}
              className="text-xs text-cyan-300 hover:text-white bg-cyan-950/80 border border-cyan-500/40 px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-medium hover:border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
            >
              <span>Go to OIC Reporting Console →</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#0b1016] border border-cyan-800/50 rounded-2xl w-full shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-cyan-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#070b0e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-outfit flex items-center gap-2">
                <span>Admission Committee Central Console</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono">
                  Session 2026-27
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Panchayat College, Bargarh · SAMS Merit Management & OIC Keystore
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenOicReporting && (
              <button
                onClick={onOpenOicReporting}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/60 flex items-center gap-1.5 cursor-pointer hover:border-cyan-400"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>OIC Reporting</span>
              </button>
            )}
            {onAdminLogout && (
              <button
                onClick={onAdminLogout}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-950/40 border border-red-500/30 text-red-300 hover:bg-red-900/50 flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-6">
          
          {/* Admin Auth Status Banner */}
          {isAdmin ? (
            <div className="bg-[#070b0e] border border-cyan-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white font-outfit">
                      {adminSession?.name || 'Chief Admission Officer'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono">
                      Active Session ({adminSession?.role || 'Super Admin'})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    ID: {adminSession?.adminId || currentUser?.email || DEFAULT_ADMIN_ID} · {adminSession?.desk || 'Central Committee'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveAdminTab(activeAdminTab === 'officers' ? 'merit' : 'officers')}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{activeAdminTab === 'officers' ? 'Switch to Excel Import' : 'Edit OIC Credentials'}</span>
                </button>
                {onAdminLogout && (
                  <button
                    type="button"
                    onClick={onAdminLogout}
                    className="px-3 py-1.5 bg-red-950/40 border border-red-500/30 hover:bg-red-900/40 text-red-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-amber-950/40 border border-amber-600/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-xs text-amber-300">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  You are browsing in Review Mode. Sign in with your <strong>Admin or OIC ID & Password</strong> to publish Excel sheets and verify candidate documents.
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-lg text-xs shrink-0 whitespace-nowrap cursor-pointer shadow-lg"
              >
                Sign In with Admin / OIC Credentials
              </button>
            </div>
          )}

          {/* Sub Navigation: Switch between Excel Management and OIC Login Credentials */}
          <div className="flex items-center gap-2 border-b border-cyan-950/40 pb-3">
            <button
              type="button"
              onClick={() => setActiveAdminTab('merit')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeAdminTab === 'merit'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                  : 'text-slate-400 hover:text-white bg-[#070b0e] border border-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
              <span>SAMS Excel Sheets & Merit List</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveAdminTab('officers')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeAdminTab === 'officers'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                  : 'text-slate-400 hover:text-white bg-[#070b0e] border border-slate-800'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>OIC Login Credentials (4 Sets)</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-900/80 text-cyan-200 font-mono">
                {officerCredentials.length} Sets
              </span>
            </button>
          </div>

          {/* Alerts */}
          {officerSuccessMessage && (
            <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3.5 flex items-center gap-3 text-xs text-emerald-300 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{officerSuccessMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-200 animate-fadeIn shadow-lg">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
              {reflectedOicInfo && onOpenOicReporting && (
                <button
                  type="button"
                  onClick={onOpenOicReporting}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)] shrink-0 flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>View in OIC Reporting Console ↗</span>
                </button>
              )}
            </div>
          )}

          {parseError && (
            <div className="bg-red-950/60 border border-red-500/40 rounded-xl p-3.5 flex items-center gap-3 text-xs text-red-300 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: OIC LOGIN CREDENTIALS MANAGEMENT (Requested by User) */}
          {/* ========================================================= */}
          {activeAdminTab === 'officers' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white font-outfit flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-cyan-400" />
                    <span>Officer-in-Charge (OIC) Login Credential Keystore</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Admin can edit IDs, passwords, and desk allocations for <strong>'OIC reporting'</strong> and <strong>'OIC roll no'</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetToDefaultOfficerSets}
                    className="px-3 py-1.5 text-xs text-slate-300 bg-slate-900 border border-slate-700 hover:border-cyan-500/40 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Reset 4 Sets to Default</span>
                  </button>
                </div>
              </div>

              {/* 4 Sets Summary Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {officerCredentials.map((officer, index) => {
                  const isVisible = visiblePasswordIds[officer.id];
                  const isReporting = officer.role === 'OIC reporting';

                  return (
                    <div 
                      key={officer.id}
                      className="bg-[#070b0e] border border-cyan-950/70 hover:border-cyan-500/40 rounded-xl p-4.5 space-y-3 transition-all relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white font-outfit">
                              Set {index + 1}: {officer.officerName}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                              isReporting 
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40' 
                                : 'bg-teal-950 text-teal-300 border border-teal-500/40'
                            }`}>
                              {officer.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {officer.desk}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditOfficer(officer)}
                            className="p-1.5 text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/30 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1"
                            title="Edit this OIC login ID and password"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </div>

                      {/* Login Credentials Box */}
                      <div className="bg-[#0b1016] border border-slate-800 rounded-lg p-3 space-y-2 text-xs font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-[11px]">Staff Login ID:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-200 font-semibold select-all">{officer.loginId}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyCredentials(officer.loginId, `${officer.id}_id`)}
                              className="text-slate-500 hover:text-cyan-400"
                              title="Copy ID"
                            >
                              {copiedId === `${officer.id}_id` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-[11px]">Password:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-cyan-300 font-semibold select-all">
                              {isVisible ? officer.password : '••••••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(officer.id)}
                              className="text-slate-500 hover:text-slate-300 p-0.5"
                              title={isVisible ? 'Hide password' : 'Show password'}
                            >
                              {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyCredentials(officer.password, `${officer.id}_pass`)}
                              className="text-slate-500 hover:text-cyan-400 ml-1"
                              title="Copy password"
                            >
                              {copiedId === `${officer.id}_pass` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Role powers summary */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                        <span>
                          {isReporting 
                            ? 'Powers: Physical reporting & certificate approvals' 
                            : 'Powers: Allotting college roll nos & confirming admission'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleOfficerActive(officer.id)}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer ${
                            officer.active 
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' 
                              : 'bg-red-950 text-red-300 border border-red-500/30'
                          }`}
                        >
                          {officer.active ? 'Account Active' : 'Account Disabled'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Super Admin Credential Box */}
              <div className="bg-[#070b0e] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="text-xs font-bold text-white font-outfit flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Super Administrator Account (All Privileges)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Login ID: <strong className="text-slate-200">{SUPER_ADMIN_CREDENTIAL.loginId}</strong> · Password: <strong className="text-cyan-300">{SUPER_ADMIN_CREDENTIAL.password}</strong>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Full Authority over Excel imports and OIC keystore
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: EXCEL MERIT IMPORT & CANDIDATE MANAGEMENT */}
          {/* ========================================================= */}
          {activeAdminTab === 'merit' && (
            <>
              {/* Section 1: Excel Sheet Import Card */}
              <div className="bg-[#070b0e] border border-cyan-950/60 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white font-outfit flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                      <span>Upload SAMS Merit Excel Sheet (10 Admission Fields)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Automatically imports and maps: <strong className="text-cyan-300">Barcode No</strong>, <strong className="text-cyan-300">Applicant Name</strong>, <strong className="text-cyan-300">Admission Date</strong>, <strong className="text-cyan-300">Mark(%)</strong>, <strong className="text-cyan-300">Social Category</strong>, <strong className="text-cyan-300">Selection Category</strong>, <strong className="text-cyan-300">Mobile Number</strong>, <strong className="text-cyan-300">Board Name</strong>, <strong className="text-cyan-300">Stream</strong>, and <strong className="text-cyan-300">Major Subject</strong>.
                    </p>
                    {/* Visual 10-field badges */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[
                        '1. Barcode No',
                        '2. Applicant Name',
                        '3. Admission Date',
                        '4. Mark(%)',
                        '5. Social Category',
                        '6. Selection Category',
                        '7. Mobile Number',
                        '8. Board Name',
                        '9. Stream',
                        '10. Major Subject',
                      ].map((fieldBadge, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 font-mono"
                        >
                          {fieldBadge}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => downloadSampleTemplate(targetRound)}
                      className="px-3 py-1.5 text-xs text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900/60 border border-cyan-500/40 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Download blank sample Excel template with 10 exact column headers"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Download 10-Field Template</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowManualForm(!showManualForm)}
                      className="px-3 py-1.5 text-xs text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{showManualForm ? 'Hide Form' : 'Add Single'}</span>
                    </button>
                  </div>
                </div>

                {/* Target Round Picker & Sync Mode */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">Target Section & Round:</span>
                    <select
                      value={targetRound}
                      onChange={(e) => setTargetRound(e.target.value as RoundType)}
                      className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="selection_round_1">Selection Round 1</option>
                      <option value="selection_round_2">Selection Round 2</option>
                      <option value="spot_round_1">Spot Admission Round</option>
                      <option value="waiting_list">Waiting List</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 bg-[#05080b] p-1 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-400 pl-1.5 font-medium">Sync Mode:</span>
                    <button
                      type="button"
                      onClick={() => setSyncMode('replace')}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                        syncMode === 'replace'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Replaces records for target round - eliminates duplicate rows"
                    >
                      Clean Sync (Zero Duplicates)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSyncMode('merge')}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                        syncMode === 'merge'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Updates matching barcodes and adds new records"
                    >
                      Merge & Update
                    </button>
                  </div>
                </div>
                <div className="border-2 border-dashed border-cyan-950/80 hover:border-cyan-500/50 rounded-xl p-6 text-center bg-[#0a0f15]/60 transition-colors">
                  <input
                    type="file"
                    id="excelUploadInput"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="excelUploadInput" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {file ? file.name : 'Click to select or drag and drop SAMS Excel Sheet'}
                    </div>
                    <p className="text-xs text-slate-500">
                      Supported formats: Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
                    </p>
                  </label>
                </div>

                {/* Parsed Preview Table */}
                {isParsing && (
                  <div className="text-center py-4 text-xs text-cyan-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Parsing spreadsheet and extracting all 10 admission fields...</span>
                  </div>
                )}

                {parsedPreview && (
                  <div className="bg-[#0b1016] border border-cyan-950/60 rounded-xl p-4 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="text-xs text-slate-300 font-semibold flex items-center gap-2 flex-wrap">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Parsed {parsedPreview.candidates.length} candidates from {file?.name}</span>
                        {(targetRound === 'selection_round_1' || targetRound === 'selection_round_2') && (
                          <span className="text-[10px] font-mono font-medium text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Reflects to OIC Reporting Console
                          </span>
                        )}
                      </div>
                      <button
                        onClick={handleConfirmImport}
                        disabled={isSaving}
                        className="px-4 py-2 text-xs font-semibold text-[#070b0e] bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 rounded-lg transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 cursor-pointer"
                      >
                        {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>
                          {targetRound === 'selection_round_1' || targetRound === 'selection_round_2'
                            ? 'Confirm & Reflect to OIC Reporting Console'
                            : 'Confirm & Publish to Portal'}
                        </span>
                      </button>
                    </div>

                    <div className="overflow-x-auto max-h-60 rounded-lg border border-slate-800">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-[#070b0e] text-slate-400 sticky top-0 border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">1. Barcode No</th>
                            <th className="py-2.5 px-3">2. Applicant Name</th>
                            <th className="py-2.5 px-3">3. Admission Date</th>
                            <th className="py-2.5 px-3">4. Mark(%)</th>
                            <th className="py-2.5 px-3">5. Social Cat</th>
                            <th className="py-2.5 px-3">6. Selection Cat</th>
                            <th className="py-2.5 px-3">7. Mobile Number</th>
                            <th className="py-2.5 px-3">8. Board Name</th>
                            <th className="py-2.5 px-3">9. Stream</th>
                            <th className="py-2.5 px-3">10. Major Subject</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 font-mono text-[11px]">
                          {parsedPreview.candidates.slice(0, 10).map((c, i) => (
                            <tr key={i} className="hover:bg-slate-900/50">
                              <td className="py-2 px-3 text-slate-500">{i + 1}</td>
                              <td className="py-2 px-3 text-cyan-300 font-semibold">{c.barcodeNumber}</td>
                              <td className="py-2 px-3 text-white font-sans font-medium">{c.applicantName || c.name}</td>
                              <td className="py-2 px-3 text-slate-300">{c.admissionDate || c.reportingDate || 'N/A'}</td>
                              <td className="py-2 px-3 text-cyan-400 font-bold">{c.percentage}%</td>
                              <td className="py-2 px-3">
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                                  {c.socialCategory || c.category || 'GEN'}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px]">
                                  {c.selectionCategory || 'UR'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-300">{c.mobileNumber || c.mobile}</td>
                              <td className="py-2 px-3 text-slate-400 font-sans">{c.boardName || 'CHSE, Odisha'}</td>
                              <td className="py-2 px-3 font-sans text-teal-300">{c.stream}</td>
                              <td className="py-2 px-3 font-sans text-emerald-300">{c.majorSubject || c.subject}</td>
                              <td className="py-2 px-3 font-sans">
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                                  {c.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {parsedPreview.candidates.length > 10 && (
                      <p className="text-[11px] text-slate-400 font-mono text-right">
                        Showing first 10 of {parsedPreview.candidates.length} parsed candidates. All {parsedPreview.candidates.length} will be saved on confirmation.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Section 2: Manual Candidate Entry Form */}
              {showManualForm && (
                <form onSubmit={handleManualSubmit} className="bg-[#070b0e] border border-cyan-950/60 rounded-xl p-5 space-y-4 animate-fadeIn">
                  <h3 className="text-sm font-bold text-white font-outfit flex items-center gap-2">
                    <Plus className="w-4 h-4 text-cyan-400" />
                    <span>Add Individual Candidate to {targetRound.replace(/_/g, ' ').toUpperCase()} (10 Fields)</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* 1. Barcode No */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">1. Barcode Number *</label>
                      <input
                        type="text"
                        required
                        value={manualBarcode}
                        onChange={(e) => setManualBarcode(e.target.value)}
                        placeholder="e.g. 26D109495"
                        className="w-full bg-[#0b1016] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>

                    {/* 2. Applicant Name */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">2. Applicant Name *</label>
                      <input
                        type="text"
                        required
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="Full applicant name"
                        className="w-full bg-[#0b1016] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    {/* 3. Admission Date */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">3. Admission Date *</label>
                      <input
                        type="date"
                        required
                        value={manualAdmissionDate}
                        onChange={(e) => setManualAdmissionDate(e.target.value)}
                        className="w-full bg-[#0b1016] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>

                    {/* 4. Mark(%) */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">4. Mark(%) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={manualPercentage}
                        onChange={(e) => setManualPercentage(e.target.value)}
                        placeholder="85.50"
                        className="w-full bg-[#0b1016] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>

                    {/* 5. Social Category */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">5. Social Category</label>
                      <select
                        value={manualSocialCategory}
                        onChange={(e) => setManualSocialCategory(e.target.value)}
                        className="w-full bg-[#0b1016] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                      >
                        <option value="GEN">GEN (General)</option>
                        <option value="SC">SC (Scheduled Caste)</option>
                        <option value="ST">ST (Scheduled Tribe)</option>
                        <option value="OBC">OBC</option>
                        <option value="SEBC">SEBC</option>
                      </select>
                    </div>

                    {/* 6. Selection Category */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">6. Selection Category</label>
                      <select
                        value={manualSelectionCategory}
                        onChange={(e) => setManualSelectionCategory(e.target.value)}
                        className="w-full bg-[#0b1016] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                      >
                        <option value="UR">UR (Unreserved)</option>
                        <option value="SC">SC</option>
                        <option value="ST">ST</option>
                        <option value="ESM">ESM (Ex-Servicemen)</option>
                        <option value="PWD">PWD (Persons with Disability)</option>
                        <option value="SEBC">SEBC</option>
                      </select>
                    </div>

                    {/* 7. Mobile Number */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">7. Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        value={manualMobile}
                        onChange={(e) => setManualMobile(e.target.value)}
                        placeholder="10-digit mobile"
                        className="w-full bg-[#0b1016] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>

                    {/* 8. Board Name */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">8. Board Name</label>
                      <input
                        type="text"
                        value={manualBoardName}
                        onChange={(e) => setManualBoardName(e.target.value)}
                        placeholder="CHSE, Odisha / CBSE"
                        className="w-full bg-[#0b1016] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    {/* 9. Stream */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">9. Stream</label>
                      <select
                        value={manualStream}
                        onChange={(e) => setManualStream(e.target.value as StreamType)}
                        className="w-full bg-[#0b1016] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                      >
                        <option value="Science">Science</option>
                        <option value="Arts">Arts</option>
                        <option value="Commerce">Commerce</option>
                        <option value="Self-Financing">Self-Financing</option>
                      </select>
                    </div>

                    {/* 10. Major Subject */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">10. Major Subject</label>
                      <input
                        type="text"
                        value={manualMajorSubject}
                        onChange={(e) => setManualMajorSubject(e.target.value)}
                        placeholder="Physics, Botany, etc."
                        className="w-full bg-[#0b1016] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    {/* Rank */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Merit Rank</label>
                      <input
                        type="number"
                        value={manualRank}
                        onChange={(e) => setManualRank(e.target.value)}
                        className="w-full bg-[#0b1016] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Status</label>
                      <select
                        value={manualStatus}
                        onChange={(e) => setManualStatus(e.target.value as CandidateStatus)}
                        className="w-full bg-[#0b1016] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                      >
                        <option value="Selected">Selected</option>
                        <option value="Provisionally Admitted">Provisionally Admitted</option>
                        <option value="Spot Eligible">Spot Eligible</option>
                        <option value="Waiting">Waiting</option>
                        <option value="Reported & Verified">Reported & Verified</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowManualForm(false)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 text-xs font-semibold text-[#070b0e] bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-all cursor-pointer"
                    >
                      Save Candidate
                    </button>
                  </div>
                </form>
              )}

              {/* Section 3: Live Records Directory & Quick Actions */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white font-outfit flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>Existing Portal Records ({records.length} Total)</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Manage candidate verification statuses, view all 10 admission fields, or export back to Excel.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                        placeholder="Filter records..."
                        className="bg-[#070b0e] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-44"
                      />
                    </div>
                    {onCleanDuplicates && (
                      <button
                        type="button"
                        onClick={handleTriggerCleanDuplicates}
                        disabled={isCleaningDuplicates}
                        className="px-2.5 py-1.5 text-xs text-amber-300 hover:text-white bg-amber-950/60 border border-amber-500/40 hover:bg-amber-900/60 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        title="Scan and remove any duplicate student records from database"
                      >
                        {isCleaningDuplicates ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-amber-400" />}
                        <span>{isCleaningDuplicates ? 'Deduplicating...' : 'Clean Duplicates'}</span>
                      </button>
                    )}
                    {records.length > 0 && (
                      <button
                        onClick={() => exportCandidatesToExcel(records, 'Panchayat_College_Merit_Records.xlsx')}
                        className="px-2.5 py-1.5 text-xs text-cyan-300 hover:text-white bg-cyan-950/70 border border-cyan-500/40 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                        title="Export all candidates with 10 fields to Excel"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="hidden sm:inline">Export Excel</span>
                      </button>
                    )}
                    <button
                      onClick={onResetSeedData}
                      className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-cyan-400 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                      title="Reload official Panchayat College demo data"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Reset Seed</span>
                    </button>
                  </div>
                </div>

                <div className="bg-[#070b0e] border border-cyan-950/40 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-[#05080b] text-slate-400 sticky top-0 border-b border-slate-800 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Barcode No</th>
                        <th className="py-2.5 px-3">Applicant Name</th>
                        <th className="py-2.5 px-3">Admission Date</th>
                        <th className="py-2.5 px-3">Mark(%)</th>
                        <th className="py-2.5 px-3">Social / Selection</th>
                        <th className="py-2.5 px-3">Mobile Number</th>
                        <th className="py-2.5 px-3">Board Name</th>
                        <th className="py-2.5 px-3">Stream & Major Subject</th>
                        <th className="py-2.5 px-3">Round</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {filteredAdminRecords.slice(0, 50).map((r) => (
                        <tr key={r.id} className="hover:bg-slate-900/60">
                          <td className="py-2 px-3 font-mono text-cyan-300 font-semibold">{r.barcodeNumber}</td>
                          <td className="py-2 px-3 font-medium text-white">{r.applicantName || r.name}</td>
                          <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">{r.admissionDate || r.reportingDate || 'N/A'}</td>
                          <td className="py-2 px-3 font-mono text-cyan-400 font-semibold">{r.percentage}%</td>
                          <td className="py-2 px-3">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 mr-1">
                              {r.socialCategory || r.category || 'GEN'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                              {r.selectionCategory || 'UR'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">{r.mobileNumber || r.mobile}</td>
                          <td className="py-2 px-3 text-slate-400 text-[11px]">{r.boardName || 'CHSE, Odisha'}</td>
                          <td className="py-2 px-3 text-[11px]">
                            <span className="text-teal-300">{r.stream}</span> - <span className="text-emerald-300">{r.majorSubject || r.subject}</span>
                          </td>
                          <td className="py-2 px-3 text-[11px] font-mono text-slate-400">
                            {r.roundType.replace(/_/g, ' ')}
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={r.status}
                              onChange={(e) => onUpdateRecord({ ...r, status: e.target.value as CandidateStatus })}
                              className="bg-[#0b1016] border border-slate-800 rounded px-2 py-0.5 text-[11px] text-cyan-300 focus:outline-none"
                            >
                              <option value="Selected">Selected</option>
                              <option value="Admission Confirmed">Admission Confirmed</option>
                              <option value="Document Verification Pending">Doc Pending</option>
                              <option value="Spot Eligible">Spot Eligible</option>
                              <option value="Waiting">Waiting</option>
                              <option value="Reported & Verified">Reported & Verified</option>
                              <option value="Absent">Absent</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() => onDeleteRecord(r.id)}
                              className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                              title="Delete candidate"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Edit Officer Modal Dialog */}
        {editingOfficer && (
          <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-[#0b1016] border border-cyan-800/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-cyan-950/50 flex items-center justify-between bg-[#070b0e]">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white font-outfit">
                    Edit OIC Login Credentials
                  </h3>
                </div>
                <button onClick={() => setEditingOfficer(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditedOfficer} className="p-5 space-y-3.5 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Officer Role Assignment *
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as OfficerRole)}
                    className="w-full bg-[#070b0e] border border-slate-800 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-cyan-400"
                  >
                    <option value="OIC reporting">OIC reporting (Physical Reporting & Verification)</option>
                    <option value="OIC roll no">OIC roll no (Roll Allotment & Admission Confirmation)</option>
                    <option value="Super Admin">Super Admin (Central Control)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Officer In-Charge Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formOfficerName}
                    onChange={(e) => setFormOfficerName(e.target.value)}
                    placeholder="e.g. Dr. S. K. Dash"
                    className="w-full bg-[#070b0e] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Staff Login ID / Email *
                  </label>
                  <input
                    type="text"
                    required
                    value={formLoginId}
                    onChange={(e) => setFormLoginId(e.target.value)}
                    placeholder="oic.reporting1@panchayatcollege.ac.in"
                    className="w-full bg-[#070b0e] border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Officer can login using this full email or short username ({formLoginId.split('@')[0]})
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Security Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Enter security password"
                    className="w-full bg-[#070b0e] border border-slate-800 rounded-lg px-3 py-2 text-cyan-300 font-mono font-semibold focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Desk / Counter Designation
                  </label>
                  <input
                    type="text"
                    value={formDesk}
                    onChange={(e) => setFormDesk(e.target.value)}
                    placeholder="e.g. OIC Reporting Desk-1 (Science Block)"
                    className="w-full bg-[#070b0e] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingOfficer(null)}
                    className="px-3 py-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Credentials</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-cyan-950/50 bg-[#070b0e] flex items-center justify-between text-xs text-slate-400">
          <span>Panchayat College Bargarh · Admission Committee Central Control</span>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
            >
              Return to Home
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
