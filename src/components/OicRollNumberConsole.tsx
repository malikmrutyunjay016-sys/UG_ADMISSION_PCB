import React, { useState, useMemo } from 'react';
import { MeritRecord, StreamType } from '../types/admission';
import { isVerifiedForRollAllotment } from '../utils/authCredentials';
import { exportCandidatesToExcel } from '../utils/excelParser';
import { AdminSession } from './AdminLoginModal';
import { 
  Hash, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  X, 
  Download, 
  Printer, 
  Phone, 
  Copy, 
  Check, 
  RotateCcw, 
  Sparkles,
  ArrowLeft,
  UserCheck,
  Edit3,
  Award,
  BookOpen,
  FileCheck2
} from 'lucide-react';

interface OicRollNumberConsoleProps {
  records: MeritRecord[];
  onUpdateRecord: (updated: MeritRecord) => Promise<void>;
  onBatchUpdateRecords?: (updated: MeritRecord[]) => Promise<void>;
  adminSession: AdminSession | null;
  isAdmin: boolean;
  onClose?: () => void;
  onOpenAdminPortal?: () => void;
  onOpenVerification?: () => void;
  onOpenOicReporting?: () => void;
}

export const OicRollNumberConsole: React.FC<OicRollNumberConsoleProps> = ({
  records,
  onUpdateRecord,
  onBatchUpdateRecords,
  adminSession,
  isAdmin,
  onClose,
  onOpenAdminPortal,
  onOpenVerification,
  onOpenOicReporting,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [streamFilter, setStreamFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All'); // 'All', 'Unassigned', 'Allotted', 'Confirmed'
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Roll No Modal State (Single Allotment / Edit)
  const [allottingCandidate, setAllottingCandidate] = useState<MeritRecord | null>(null);
  const [customRollNo, setCustomRollNo] = useState('');
  const [isConfirmAdmissionOnAllot, setIsConfirmAdmissionOnAllot] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-allot confirmation modal state
  const [isBatchAutoAllotOpen, setIsBatchAutoAllotOpen] = useState(false);
  const [batchPrefix, setBatchPrefix] = useState('AUTO');

  // Filter ONLY applicants who are verified in Verification Officer Console
  const verifiedApplicants = useMemo(() => {
    return records.filter(isVerifiedForRollAllotment);
  }, [records]);

  // List of unique subjects
  const availableSubjects = useMemo(() => {
    const subs = new Set<string>();
    verifiedApplicants.forEach((r) => {
      const s = r.majorSubject || r.subject;
      if (s) subs.add(s);
    });
    return Array.from(subs).sort();
  }, [verifiedApplicants]);

  // Generate suggested sequential roll number for a stream
  const getSuggestedRollNo = (candidate: MeritRecord) => {
    const stream = candidate.stream;
    const yearPrefix = '26'; // Academic Year 2026-27
    let streamCode = 'BS'; // Bachelor of Science
    if (stream === 'Arts') streamCode = 'BA';
    else if (stream === 'Commerce') streamCode = 'BC';
    else if (stream === 'Self-Financing') streamCode = 'SF';

    // Count existing candidates in same stream with this prefix
    const streamRecords = records.filter(
      (r) => r.stream === stream && r.rollNumber && r.rollNumber.startsWith(`${streamCode}${yearPrefix}-`)
    );

    // Extract max sequence number
    let maxNum = 0;
    streamRecords.forEach((r) => {
      if (r.rollNumber) {
        const parts = r.rollNumber.split('-');
        if (parts.length === 2) {
          const n = parseInt(parts[1], 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
    });

    const nextNum = String(maxNum + 1).padStart(3, '0');
    return `${streamCode}${yearPrefix}-${nextNum}`;
  };

  // Filtered applicants
  const filteredApplicants = useMemo(() => {
    return verifiedApplicants.filter((r) => {
      // Stream filter
      if (streamFilter !== 'All' && r.stream !== streamFilter) return false;

      // Subject filter
      if (subjectFilter !== 'All' && (r.majorSubject || r.subject) !== subjectFilter) return false;

      // Roll Allotment Status filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Unassigned' && Boolean(r.rollNumber)) return false;
        if (statusFilter === 'Allotted' && (!r.rollNumber || r.status === 'Admission Confirmed')) return false;
        if (statusFilter === 'Confirmed' && r.status !== 'Admission Confirmed') return false;
      }

      // Search query (Barcode, Roll No, Name, Mobile, Subject, Token)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const b = (r.barcodeNumber || '').toLowerCase();
        const rn = (r.rollNumber || '').toLowerCase();
        const n = (r.applicantName || r.name || '').toLowerCase();
        const m = (r.mobileNumber || r.mobile || '').toLowerCase();
        const s = (r.majorSubject || r.subject || '').toLowerCase();
        const t = r.tokenNumber ? String(r.tokenNumber) : '';
        return b.includes(q) || rn.includes(q) || n.includes(q) || m.includes(q) || s.includes(q) || t === q;
      }

      return true;
    }).sort((a, b) => {
      // Primary: Roll number if present, else token order
      if (a.rollNumber && b.rollNumber) {
        return a.rollNumber.localeCompare(b.rollNumber);
      }
      if (a.rollNumber) return -1;
      if (b.rollNumber) return 1;

      // Secondary: Token Number
      const tokA = a.tokenNumber || 9999;
      const tokB = b.tokenNumber || 9999;
      if (tokA !== tokB) return tokA - tokB;

      // Tertiary: Percentage descending
      return b.percentage - a.percentage;
    });
  }, [verifiedApplicants, streamFilter, statusFilter, subjectFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = verifiedApplicants.length;
    const unassigned = verifiedApplicants.filter((r) => !r.rollNumber).length;
    const allotted = verifiedApplicants.filter((r) => Boolean(r.rollNumber)).length;
    const confirmed = verifiedApplicants.filter((r) => r.status === 'Admission Confirmed').length;
    return { total, unassigned, allotted, confirmed };
  }, [verifiedApplicants]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Roll No Modal
  const openRollAllotmentModal = (candidate: MeritRecord) => {
    setAllottingCandidate(candidate);
    if (candidate.rollNumber) {
      setCustomRollNo(candidate.rollNumber);
    } else {
      setCustomRollNo(getSuggestedRollNo(candidate));
    }
    setIsConfirmAdmissionOnAllot(true);
  };

  // Save Single Roll Number Allotment
  const handleSaveRollNumber = async () => {
    if (!allottingCandidate) return;
    const rollTrimmed = customRollNo.trim().toUpperCase();
    if (!rollTrimmed) {
      setNotification({ type: 'error', message: 'Please enter a valid College Roll Number.' });
      return;
    }

    // Check duplicate roll number among other candidates
    const duplicate = records.find(
      (r) => (r.barcodeNumber !== allottingCandidate.barcodeNumber) && 
             r.rollNumber && 
             r.rollNumber.toUpperCase() === rollTrimmed
    );
    if (duplicate) {
      setNotification({ 
        type: 'error', 
        message: `Roll Number "${rollTrimmed}" is already allotted to ${duplicate.applicantName || duplicate.name} (${duplicate.barcodeNumber}).` 
      });
      return;
    }

    setIsSubmitting(true);
    const now = new Date();
    const officerDesc = adminSession ? `${adminSession.name} (${adminSession.desk || 'OIC Roll No'})` : 'OIC Roll Number';

    const updated: MeritRecord = {
      ...allottingCandidate,
      rollNumber: rollTrimmed,
      rollAllottedAt: now.toISOString(),
      rollAllottedBy: officerDesc,
      status: isConfirmAdmissionOnAllot ? 'Admission Confirmed' : allottingCandidate.status,
      notes: `${allottingCandidate.notes || ''} | Roll No ${rollTrimmed} allotted by ${officerDesc} on ${now.toLocaleDateString('en-IN')}.`.trim(),
      updatedAt: now.toISOString(),
    };

    try {
      await onUpdateRecord(updated);
      setNotification({
        type: 'success',
        message: `College Roll No ${rollTrimmed} successfully allotted to ${allottingCandidate.applicantName || allottingCandidate.name}!`,
      });
      setAllottingCandidate(null);
      setTimeout(() => setNotification(null), 4000);
    } catch {
      setNotification({ type: 'error', message: 'Failed to save College Roll Number.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick 1-Click Auto Allot Roll Number
  const handleQuickAllot = async (candidate: MeritRecord) => {
    const suggested = getSuggestedRollNo(candidate);
    setIsSubmitting(true);
    const now = new Date();
    const officerDesc = adminSession ? `${adminSession.name}` : 'OIC Roll Number';

    const updated: MeritRecord = {
      ...candidate,
      rollNumber: suggested,
      rollAllottedAt: now.toISOString(),
      rollAllottedBy: officerDesc,
      status: 'Admission Confirmed',
      notes: `${candidate.notes || ''} | Roll No ${suggested} allotted by ${officerDesc} on ${now.toLocaleDateString('en-IN')}.`.trim(),
      updatedAt: now.toISOString(),
    };

    try {
      await onUpdateRecord(updated);
      setNotification({
        type: 'success',
        message: `Roll No ${suggested} allotted & Admission Confirmed for ${candidate.applicantName || candidate.name}.`,
      });
      setTimeout(() => setNotification(null), 4000);
    } catch {
      setNotification({ type: 'error', message: 'Failed to auto-allot roll number.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove / Reset Roll Number
  const handleResetRollNumber = async (candidate: MeritRecord) => {
    setIsSubmitting(true);
    const now = new Date();
    const officerDesc = adminSession ? `${adminSession.name}` : 'OIC Roll Number';

    const updated: MeritRecord = {
      ...candidate,
      rollNumber: undefined,
      rollAllottedAt: undefined,
      rollAllottedBy: undefined,
      status: 'Reported & Verified',
      notes: `Roll Number allotment revoked by ${officerDesc} on ${now.toLocaleDateString('en-IN')}. Returned to unallotted verified queue.`,
      updatedAt: now.toISOString(),
    };

    try {
      await onUpdateRecord(updated);
      setNotification({
        type: 'success',
        message: `Roll number for ${candidate.applicantName || candidate.name} revoked. Candidate returned to Unallotted list.`,
      });
      setTimeout(() => setNotification(null), 4000);
    } catch {
      setNotification({ type: 'error', message: 'Failed to reset roll number.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Batch Auto-Allot for all unassigned verified applicants
  const handleBatchAutoAllotAll = async () => {
    const unassigned = verifiedApplicants.filter((r) => !r.rollNumber);
    if (unassigned.length === 0) {
      setNotification({ type: 'error', message: 'No unassigned verified candidates found.' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Group by stream and assign sequential numbers
      const streamCounters: Record<string, number> = {
        Science: 0,
        Arts: 0,
        Commerce: 0,
        'Self-Financing': 0,
      };

      // Find current max for each stream
      ['Science', 'Arts', 'Commerce', 'Self-Financing'].forEach((st) => {
        const existing = records.filter((r) => r.stream === st && r.rollNumber);
        let maxVal = 0;
        existing.forEach((r) => {
          if (r.rollNumber) {
            const parts = r.rollNumber.split('-');
            if (parts.length === 2) {
              const num = parseInt(parts[1], 10);
              if (!isNaN(num) && num > maxVal) maxVal = num;
            }
          }
        });
        streamCounters[st] = maxVal;
      });

      const now = new Date();
      const officerDesc = adminSession ? `${adminSession.name} (${adminSession.desk || 'OIC Roll No'})` : 'OIC Roll Number';

      for (const cand of unassigned) {
        const stream = cand.stream || 'Science';
        const nextIdx = (streamCounters[stream] || 0) + 1;
        streamCounters[stream] = nextIdx;

        let streamCode = 'BS';
        if (stream === 'Arts') streamCode = 'BA';
        else if (stream === 'Commerce') streamCode = 'BC';
        else if (stream === 'Self-Financing') streamCode = 'SF';

        const rollVal = `${streamCode}26-${String(nextIdx).padStart(3, '0')}`;

        const updated: MeritRecord = {
          ...cand,
          rollNumber: rollVal,
          rollAllottedAt: now.toISOString(),
          rollAllottedBy: officerDesc,
          status: 'Admission Confirmed',
          notes: `${cand.notes || ''} | Batch Roll No ${rollVal} allotted by ${officerDesc} on ${now.toLocaleDateString('en-IN')}.`.trim(),
          updatedAt: now.toISOString(),
        };

        await onUpdateRecord(updated);
      }

      setNotification({
        type: 'success',
        message: `Successfully batch allotted roll numbers & confirmed admission for ${unassigned.length} verified candidates!`,
      });
      setIsBatchAutoAllotOpen(false);
      setTimeout(() => setNotification(null), 5000);
    } catch {
      setNotification({ type: 'error', message: 'Failed to complete batch roll number allotment.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export Roll Number Register to Excel
  const handleExportRollRegister = () => {
    if (verifiedApplicants.length === 0) return;
    const filename = `Panchayat_College_UG_Roll_Number_Register_${new Date().toISOString().split('T')[0]}.xlsx`;
    exportCandidatesToExcel(filteredApplicants, filename);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn space-y-6">
      
      {/* Top Banner & Official Header */}
      <div className="bg-[#0b1016] border border-cyan-800/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
              <Hash className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white font-outfit tracking-tight">
                  OIC Roll Number Console
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono">
                  College Class Roll Number Allotment
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Panchayat College, Bargarh · SAMS UG e-Admission 2026-27 · Admission Roll Register Desk
              </p>
            </div>
          </div>

          {/* Active Officer Designation Badge */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="bg-[#070b0e] border border-cyan-900/60 rounded-xl px-4 py-2 flex items-center gap-2.5 text-xs font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
              <div>
                <div className="font-semibold text-white">
                  {adminSession?.name || 'OIC Roll Number Officer'}
                </div>
                <div className="text-[11px] text-cyan-400/90 truncate max-w-[220px]">
                  {adminSession?.desk || 'UG Roll No Allotment Desk'}
                </div>
              </div>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                title="Return to Home"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Back to Home</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-cyan-950/50">
          <div className="bg-[#070b0e]/80 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 uppercase font-mono block">Transferred from Verification</span>
            <span className="text-2xl font-black text-white font-mono">{stats.total}</span>
          </div>

          <div className="bg-[#070b0e]/80 border border-amber-500/30 rounded-xl p-3">
            <span className="text-[11px] text-amber-400 uppercase font-mono block flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>Awaiting Roll Number</span>
            </span>
            <span className="text-2xl font-black text-amber-300 font-mono">{stats.unassigned}</span>
          </div>

          <div className="bg-[#070b0e]/80 border border-emerald-500/30 rounded-xl p-3">
            <span className="text-[11px] text-emerald-400 uppercase font-mono block flex items-center gap-1">
              <Hash className="w-3 h-3 text-emerald-400" />
              <span>Roll Numbers Allotted</span>
            </span>
            <span className="text-2xl font-black text-emerald-300 font-mono">{stats.allotted}</span>
          </div>

          <div className="bg-[#070b0e]/80 border border-cyan-500/30 rounded-xl p-3">
            <span className="text-[11px] text-cyan-400 uppercase font-mono block flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-cyan-400" />
              <span>Admission Confirmed</span>
            </span>
            <span className="text-2xl font-black text-cyan-300 font-mono">{stats.confirmed}</span>
          </div>
        </div>
      </div>

      {/* Info Notice: Verified Transfer Pipeline */}
      <div className="bg-cyan-950/30 border border-cyan-800/40 rounded-xl p-3.5 flex items-start gap-3 text-xs text-slate-300">
        <FileCheck2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-cyan-200">Official SAMS Admission Flow Pipeline:</span>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Candidates who have been scrutinised and marked <strong className="text-emerald-300 font-mono">Verified</strong> by Verification Officers are automatically transferred to this console for College Roll Number Allotment and Admission Confirmation.
          </p>
        </div>
      </div>

      {/* Action Notification Toast */}
      {notification && (
        <div 
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs animate-fadeIn ${
            notification.type === 'success' 
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200' 
              : 'bg-red-950/80 border-red-500/50 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Control Bar: Search, Filters & Actions */}
      <div className="bg-[#0b1016] border border-cyan-950/60 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Barcode, Roll No, Token No, Name, or Subject..."
            className="w-full bg-[#070b0e] border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-[#070b0e] border border-slate-800 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none font-medium cursor-pointer"
            >
              <option value="All">All Statuses ({verifiedApplicants.length})</option>
              <option value="Unassigned">Awaiting Roll No ({stats.unassigned})</option>
              <option value="Allotted">Roll No Allotted ({stats.allotted})</option>
              <option value="Confirmed">Admission Confirmed ({stats.confirmed})</option>
            </select>
          </div>

          {/* Stream Filter */}
          <div className="bg-[#070b0e] border border-slate-800 rounded-lg px-2.5 py-1.5">
            <select
              value={streamFilter}
              onChange={(e) => setStreamFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none font-medium cursor-pointer"
            >
              <option value="All">All Streams</option>
              <option value="Science">Science (BS26)</option>
              <option value="Arts">Arts (BA26)</option>
              <option value="Commerce">Commerce (BC26)</option>
            </select>
          </div>

          {/* Subject Filter */}
          {availableSubjects.length > 0 && (
            <div className="bg-[#070b0e] border border-slate-800 rounded-lg px-2.5 py-1.5">
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-300 focus:outline-none font-medium cursor-pointer"
              >
                <option value="All">All Subjects</option>
                {availableSubjects.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          )}

          {/* Batch Auto-Allot Button */}
          {stats.unassigned > 0 && (
            <button
              onClick={() => setIsBatchAutoAllotOpen(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="Automatically assign sequential roll numbers to all pending verified applicants"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              <span>Auto-Allot ({stats.unassigned})</span>
            </button>
          )}

          {/* Export to Excel */}
          <button
            onClick={handleExportRollRegister}
            disabled={verifiedApplicants.length === 0}
            className="px-3 py-1.5 bg-[#070b0e] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            title="Download Roll Number Allotment Register in Excel"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
        </div>
      </div>

      {/* Verified Applicants Roll Allotment Table */}
      <div className="bg-[#0b1016] border border-cyan-950/60 rounded-2xl overflow-hidden shadow-2xl">
        {filteredApplicants.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto">
              <Hash className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No Verified Candidates Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {searchQuery || streamFilter !== 'All' || statusFilter !== 'All'
                ? 'No verified applicants match the selected filter criteria. Try adjusting your search query.'
                : 'Candidates will appear here automatically once marked "Verified" in the Verification Officer Console.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-cyan-950/70 bg-[#070b0e] text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3.5 text-center">Token No</th>
                  <th className="py-3 px-3">Sl No</th>
                  <th className="py-3 px-3">Barcode No</th>
                  <th className="py-3 px-3">Applicant Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Stream & Major Subject</th>
                  <th className="py-3 px-3 text-right">Mark (%)</th>
                  <th className="py-3 px-3 text-center">College Roll No</th>
                  <th className="py-3 px-3 text-center">Admission Status</th>
                  <th className="py-3 px-3.5 text-right">Roll No Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredApplicants.map((candidate, idx) => {
                  const hasRoll = Boolean(candidate.rollNumber);
                  const isConfirmed = candidate.status === 'Admission Confirmed';

                  return (
                    <tr 
                      key={candidate.id || candidate.barcodeNumber}
                      className={`hover:bg-slate-900/60 transition-colors ${
                        allottingCandidate?.barcodeNumber === candidate.barcodeNumber ? 'bg-cyan-950/30' : ''
                      }`}
                    >
                      {/* 1. Token Number */}
                      <td className="py-2.5 px-3.5 text-center">
                        {candidate.tokenNumber ? (
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-black font-mono bg-cyan-950 border border-cyan-400/60 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                            #{candidate.tokenNumber}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-500">—</span>
                        )}
                      </td>

                      {/* 2. Sl No */}
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* 3. Barcode No */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-cyan-300 font-semibold text-xs">
                            {candidate.barcodeNumber}
                          </span>
                          <button
                            onClick={() => handleCopy(candidate.barcodeNumber)}
                            className="text-slate-500 hover:text-cyan-400 transition-colors p-0.5 cursor-pointer"
                            title="Copy Barcode"
                          >
                            {copiedId === candidate.barcodeNumber ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 4. Applicant Name */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-white font-sans text-xs">
                          {candidate.applicantName || candidate.name}
                        </div>
                        {candidate.mobileNumber && (
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5 text-slate-600" />
                            <span>{candidate.mobileNumber}</span>
                          </div>
                        )}
                      </td>

                      {/* 5. Category */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                            {candidate.socialCategory || candidate.category || 'GEN'}
                          </span>
                          {candidate.selectionCategory && candidate.selectionCategory !== candidate.socialCategory && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                              {candidate.selectionCategory}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Stream & Major Subject */}
                      <td className="py-2.5 px-3">
                        <div className="text-xs">
                          <span className="font-semibold text-teal-300">{candidate.stream}</span>
                          <span className="text-slate-500 mx-1">·</span>
                          <span className="text-emerald-300 font-medium">{candidate.majorSubject || candidate.subject}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-sans">
                          {candidate.boardName || 'CHSE, Odisha'}
                        </div>
                      </td>

                      {/* 7. Mark % */}
                      <td className="py-2.5 px-3 text-right">
                        <span className="font-mono font-bold text-cyan-400 text-xs">
                          {candidate.percentage}%
                        </span>
                      </td>

                      {/* 8. College Class Roll Number */}
                      <td className="py-2.5 px-3 text-center">
                        {hasRoll ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black font-mono bg-emerald-950/80 border border-emerald-400/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                              {candidate.rollNumber}
                            </span>
                            <button
                              onClick={() => handleCopy(candidate.rollNumber!)}
                              className="text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer"
                              title="Copy Roll Number"
                            >
                              {copiedId === candidate.rollNumber ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono text-amber-400 bg-amber-950/40 border border-amber-500/30">
                            <Clock className="w-2.5 h-2.5" />
                            <span>Unassigned</span>
                          </span>
                        )}
                      </td>

                      {/* 9. Admission Status */}
                      <td className="py-2.5 px-3 text-center">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                            <UserCheck className="w-3 h-3 text-cyan-400" />
                            <span>Admission Confirmed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Verified & Transferred</span>
                          </span>
                        )}
                      </td>

                      {/* 10. Actions */}
                      <td className="py-2.5 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasRoll ? (
                            <>
                              {/* Edit Roll Number */}
                              <button
                                onClick={() => openRollAllotmentModal(candidate)}
                                disabled={isSubmitting}
                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                                title="Edit or update Roll Number"
                              >
                                <Edit3 className="w-3 h-3 text-cyan-400" />
                                <span>Edit</span>
                              </button>

                              {/* Reset Roll Number button */}
                              <button
                                onClick={() => handleResetRollNumber(candidate)}
                                disabled={isSubmitting}
                                className="p-1 text-slate-500 hover:text-amber-400 hover:bg-amber-950/20 rounded-md transition-colors cursor-pointer"
                                title="Revoke assigned roll number and return to unallotted queue"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Quick 1-Click Allot */}
                              <button
                                onClick={() => handleQuickAllot(candidate)}
                                disabled={isSubmitting}
                                className="px-2.5 py-1 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title={`Auto-allot suggested roll: ${getSuggestedRollNo(candidate)}`}
                              >
                                <Hash className="w-3 h-3 text-slate-950" />
                                <span>Allot Roll No</span>
                              </button>

                              {/* Custom Allot Dialog */}
                              <button
                                onClick={() => openRollAllotmentModal(candidate)}
                                disabled={isSubmitting}
                                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
                                title="Custom Roll Number Allotment"
                              >
                                <Edit3 className="w-3 h-3 text-slate-400" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Single Roll Number Allotment Modal */}
      {allottingCandidate && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn overflow-y-auto">
          <div className="bg-[#0b1016] border border-cyan-800/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-0 my-auto">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-cyan-950/60 bg-[#070b0e] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                  <Hash className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-outfit flex items-center gap-2">
                    <span>Allot College Class Roll Number</span>
                    {allottingCandidate.tokenNumber && (
                      <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-cyan-950 border border-cyan-400/50 text-cyan-300">
                        Token #{allottingCandidate.tokenNumber}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Assign official SAMS college roll number and confirm admission seat
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAllottingCandidate(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Candidate Summary Pill */}
            <div className="p-4 bg-[#080d12] border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-mono">Applicant Name</span>
                <span className="font-bold text-white truncate block">{allottingCandidate.applicantName || allottingCandidate.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-mono">Barcode Number</span>
                <span className="font-mono text-cyan-300 font-semibold">{allottingCandidate.barcodeNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-mono">Stream & Subject</span>
                <span className="font-semibold text-teal-300 truncate block">{allottingCandidate.stream} - {allottingCandidate.majorSubject || allottingCandidate.subject}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-mono">+2 Mark %</span>
                <span className="font-mono font-bold text-cyan-400">{allottingCandidate.percentage}%</span>
              </div>
            </div>

            {/* Form Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-cyan-300 uppercase tracking-wider block mb-1.5">
                  College Class Roll Number
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customRollNo}
                    onChange={(e) => setCustomRollNo(e.target.value)}
                    placeholder="e.g. BS26-001, BA26-045"
                    className="w-full bg-[#070b0e] border border-cyan-800/80 rounded-xl pl-9 pr-4 py-2.5 text-sm font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 uppercase tracking-wider"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                  <span>Suggested Format: Stream (BS/BA/BC) + Year (26) - Serial No</span>
                  <button
                    type="button"
                    onClick={() => setCustomRollNo(getSuggestedRollNo(allottingCandidate))}
                    className="text-cyan-400 hover:text-cyan-300 underline font-mono cursor-pointer"
                  >
                    Use Suggested ({getSuggestedRollNo(allottingCandidate)})
                  </button>
                </div>
              </div>

              {/* Confirm Admission Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#070b0e] border border-slate-800 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={isConfirmAdmissionOnAllot}
                  onChange={(e) => setIsConfirmAdmissionOnAllot(e.target.checked)}
                  className="mt-0.5 rounded text-cyan-500 focus:ring-cyan-400"
                />
                <div>
                  <span className="font-semibold text-white block">Mark Admission as Confirmed</span>
                  <span className="text-[11px] text-slate-400">
                    Simultaneously confirm the candidate's seat clearance upon roll number allotment.
                  </span>
                </div>
              </label>

              {/* Verification History / Notes */}
              {allottingCandidate.notes && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block mb-1">Verification Desk Stamp & History:</span>
                  <p className="text-slate-300 font-mono text-[11px] leading-relaxed">{allottingCandidate.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-[#070b0e] border-t border-cyan-950/60 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setAllottingCandidate(null)}
                className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveRollNumber}
                disabled={isSubmitting || !customRollNo.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Allotment</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Batch Auto Allot Confirmation Modal */}
      {isBatchAutoAllotOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-[#0b1016] border border-cyan-800/80 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-white font-outfit">
                Batch Auto-Allot Roll Numbers?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This will assign unique sequential roll numbers (e.g. <span className="text-cyan-300 font-mono">BS26-001</span>, <span className="text-cyan-300 font-mono">BA26-001</span>) to all <strong className="text-white font-mono">{stats.unassigned}</strong> verified applicants currently awaiting roll allotment and mark their admissions as confirmed.
              </p>
            </div>

            <div className="p-3 bg-[#070b0e] border border-slate-800 rounded-xl space-y-1 text-xs font-mono text-slate-300">
              <div className="flex justify-between">
                <span>Science Stream Prefix:</span>
                <span className="text-cyan-400 font-bold">BS26-XXX</span>
              </div>
              <div className="flex justify-between">
                <span>Arts Stream Prefix:</span>
                <span className="text-cyan-400 font-bold">BA26-XXX</span>
              </div>
              <div className="flex justify-between">
                <span>Commerce Stream Prefix:</span>
                <span className="text-cyan-400 font-bold">BC26-XXX</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchAutoAllotOpen(false)}
                className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBatchAutoAllotAll}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Start Batch Allotment</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
