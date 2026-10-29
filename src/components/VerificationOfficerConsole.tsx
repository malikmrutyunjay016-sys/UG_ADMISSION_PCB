import React, { useState, useMemo } from 'react';
import { MeritRecord, StreamType, CandidateStatus } from '../types/admission';
import { exportCandidatesToExcel } from '../utils/excelParser';
import { isMarkedReportedByOic } from '../utils/tokenManager';
import { AdminSession } from './AdminLoginModal';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  FileCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  AlertTriangle,
  X, 
  Download, 
  Printer, 
  Phone, 
  Copy, 
  Check, 
  ChevronRight, 
  RotateCcw, 
  Sparkles,
  FileText,
  BadgeAlert,
  ArrowLeft,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
  Hash,
  ExternalLink
} from 'lucide-react';

interface VerificationOfficerConsoleProps {
  records: MeritRecord[];
  onUpdateRecord: (updated: MeritRecord) => Promise<void>;
  adminSession: AdminSession | null;
  isAdmin: boolean;
  canAccessOicRollNo?: boolean;
  onClose?: () => void;
  onOpenAdminPortal?: () => void;
  onOpenOicReporting?: () => void;
  onOpenOicRollNo?: () => void;
}

// Predefined Verification Errors & Discrepancies
const COMMON_VERIFICATION_ERRORS = [
  'Marksheet marks/percentage mismatch with CAF',
  'Original College Leaving Certificate (CLC) missing/not produced',
  'Caste/Reservation certificate invalid or expired',
  'Discrepancy in applicant name or date of birth',
  'Original 10th Board Pass Certificate missing',
  'Conduct/Character Certificate not submitted',
  'Candidate absent or documents withheld',
  'Other defect or certificate discrepancy',
];

// Predefined Admission Denial Reasons
const COMMON_DENIAL_REASONS = [
  'Failed minimum eligibility / cut-off mark criteria',
  'Original mandatory certificates not produced within deadline',
  'Forged, altered, or invalid document detected',
  'Disqualified during physical certificate scrutiny',
  'Voluntary seat refusal / candidate opted out of admission',
  'Candidate reported with mismatching CAF details',
  'Other official disqualification reason',
];

export const VerificationOfficerConsole: React.FC<VerificationOfficerConsoleProps> = ({
  records,
  onUpdateRecord,
  adminSession,
  isAdmin,
  canAccessOicRollNo = false,
  onClose,
  onOpenAdminPortal,
  onOpenOicReporting,
  onOpenOicRollNo,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [streamFilter, setStreamFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Error Reporting Modal State
  const [reportingErrorCandidate, setReportingErrorCandidate] = useState<MeritRecord | null>(null);
  const [selectedErrorReason, setSelectedErrorReason] = useState<string>(COMMON_VERIFICATION_ERRORS[0]);
  const [errorCustomNotes, setErrorCustomNotes] = useState('');

  // Deny Admission Modal State
  const [denyingAdmissionCandidate, setDenyingAdmissionCandidate] = useState<MeritRecord | null>(null);
  const [selectedDenyReason, setSelectedDenyReason] = useState<string>(COMMON_DENIAL_REASONS[0]);
  const [denyCustomRemarks, setDenyCustomRemarks] = useState('');

  // 3 Action Output Boxes Collapse / Expand State
  const [isVerifiedExpanded, setIsVerifiedExpanded] = useState(true);
  const [isErrorExpanded, setIsErrorExpanded] = useState(true);
  const [isDeniedExpanded, setIsDeniedExpanded] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Helper: check if applicant admission was denied
  const isCandidateDenied = (r: MeritRecord) => {
    return r.status === 'Rejected' && Boolean(r.notes?.toLowerCase().includes('denied'));
  };

  // Helper: check if applicant has error/defect reported
  const isCandidateFlagged = (r: MeritRecord) => {
    return !isCandidateDenied(r) && (
      r.status === 'Rejected' || 
      Boolean(r.notes?.toLowerCase().includes('error reported')) || 
      Boolean(r.notes?.toLowerCase().includes('defect')) || 
      Boolean(r.notes?.toLowerCase().includes('deficiency'))
    );
  };

  // Helper functions to parse clean reasons from notes
  const extractDeficiencyReason = (notes?: string) => {
    if (!notes) return 'Document discrepancy or defect reported';
    const match = notes.match(/Deficiency:\s*([^.]+)/i);
    if (match && match[1]) return match[1].trim();
    return notes;
  };

  const extractDenialReason = (notes?: string) => {
    if (!notes) return 'Admission criteria not satisfied';
    const match = notes.match(/Reason:\s*([^.]+)/i);
    if (match && match[1]) return match[1].trim();
    return notes;
  };

  // Filter ONLY applicants who are marked reported in the OIC Reporting Console
  const reportingApplicants = useMemo(() => {
    return records.filter(isMarkedReportedByOic);
  }, [records]);

  // Available dates for date filter
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    reportingApplicants.forEach((r) => {
      if (r.reportingDate) dates.add(r.reportingDate);
      if (r.admissionDate) dates.add(r.admissionDate);
    });
    return Array.from(dates).sort().reverse();
  }, [reportingApplicants]);

  // Filtered & Sorted applicants
  // Sorted by reporting date & time (most recent reporting first or token order)
  const filteredApplicants = useMemo(() => {
    return reportingApplicants.filter((r) => {
      // Stream filter
      if (streamFilter !== 'All' && r.stream !== streamFilter) return false;

      // Status filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Pending' && r.status !== 'Reported') return false;
        if (statusFilter === 'Verified' && r.status !== 'Reported & Verified') return false;
        if (statusFilter === 'Confirmed' && r.status !== 'Admission Confirmed') return false;
        if (statusFilter === 'Flagged' && !isCandidateFlagged(r)) return false;
        if (statusFilter === 'Denied' && !isCandidateDenied(r)) return false;
      }

      // Date filter
      if (dateFilter !== 'All') {
        const d = r.reportingDate || r.admissionDate;
        if (d !== dateFilter) return false;
      }

      // Search query (Barcode, Name, Mobile, Subject, Token)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const b = (r.barcodeNumber || '').toLowerCase();
        const n = (r.applicantName || r.name || '').toLowerCase();
        const m = (r.mobileNumber || r.mobile || '').toLowerCase();
        const s = (r.majorSubject || r.subject || '').toLowerCase();
        const t = r.tokenNumber ? String(r.tokenNumber) : '';
        return b.includes(q) || n.includes(q) || m.includes(q) || s.includes(q) || t === q;
      }

      return true;
    }).sort((a, b) => {
      // Primary: Daily Token order if same day, or reporting timestamp
      const dateA = a.reportingDate || a.admissionDate || '';
      const dateB = b.reportingDate || b.admissionDate || '';
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA); // Most recent date first
      }
      // Same day: token order ascending (Token 1, 2, 3...)
      const tokA = a.tokenNumber || 9999;
      const tokB = b.tokenNumber || 9999;
      if (tokA !== tokB) return tokA - tokB;

      // Fallback: reporting time
      return (a.reportingTime || '').localeCompare(b.reportingTime || '');
    });
  }, [reportingApplicants, streamFilter, statusFilter, dateFilter, searchQuery]);

  // Partition filtered applicants into the 4 functional queues:
  // 1. Queue applicants (Pending verification action in main Reporting Applicants Queue)
  const queueApplicants = useMemo(() => {
    return filteredApplicants.filter((r) => {
      const isDenied = isCandidateDenied(r);
      const isFlagged = isCandidateFlagged(r);
      const isVerified = r.status === 'Reported & Verified' || r.status === 'Admission Confirmed';
      return !isDenied && !isFlagged && !isVerified;
    });
  }, [filteredApplicants]);

  // 2. Verified applicants (Transferred upon verification action)
  const verifiedApplicants = useMemo(() => {
    return filteredApplicants.filter((r) => {
      return r.status === 'Reported & Verified' || r.status === 'Admission Confirmed';
    });
  }, [filteredApplicants]);

  // 3. Error reported applicants (Transferred upon error reported action)
  const errorReportedApplicants = useMemo(() => {
    return filteredApplicants.filter(isCandidateFlagged);
  }, [filteredApplicants]);

  // 4. Denied applicants (Transferred upon deny admission action)
  const deniedApplicants = useMemo(() => {
    return filteredApplicants.filter(isCandidateDenied);
  }, [filteredApplicants]);

  // Statistics
  const stats = useMemo(() => {
    const total = reportingApplicants.length;
    const pending = reportingApplicants.filter((r) => {
      const isDenied = isCandidateDenied(r);
      const isFlagged = isCandidateFlagged(r);
      const isVerified = r.status === 'Reported & Verified' || r.status === 'Admission Confirmed';
      return !isDenied && !isFlagged && !isVerified;
    }).length;
    const verified = reportingApplicants.filter((r) => r.status === 'Reported & Verified').length;
    const confirmed = reportingApplicants.filter((r) => r.status === 'Admission Confirmed').length;
    const flagged = reportingApplicants.filter(isCandidateFlagged).length;
    const denied = reportingApplicants.filter(isCandidateDenied).length;
    return { total, pending, verified, confirmed, flagged, denied };
  }, [reportingApplicants]);

  const handleCopyBarcode = (barcode: string) => {
    navigator.clipboard.writeText(barcode);
    setCopiedId(barcode);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Error Reporting Modal
  const openErrorReport = (candidate: MeritRecord) => {
    setReportingErrorCandidate(candidate);
    setSelectedErrorReason(COMMON_VERIFICATION_ERRORS[0]);
    if (candidate.notes && (candidate.notes.includes('ERROR REPORTED') || candidate.notes.includes('defect') || candidate.notes.includes('deficiency'))) {
      setErrorCustomNotes(candidate.notes);
    } else {
      setErrorCustomNotes('');
    }
  };

  // Submit Error Report
  const handleSubmitErrorReport = async () => {
    if (!reportingErrorCandidate) return;
    setIsSubmitting(true);
    const now = new Date();
    const officerDesc = adminSession ? `${adminSession.name} (${adminSession.desk || 'Verification Desk'})` : 'Verifying Officer';

    const fullReason = errorCustomNotes.trim()
      ? `${selectedErrorReason}. Remarks: ${errorCustomNotes.trim()}`
      : selectedErrorReason;

    const updated: MeritRecord = {
      ...reportingErrorCandidate,
      status: 'Rejected',
      notes: `ERROR REPORTED by ${officerDesc} on ${now.toLocaleDateString('en-IN')} at ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}. Deficiency: ${fullReason}`,
      updatedAt: now.toISOString(),
    };

    try {
      await onUpdateRecord(updated);
      setNotification({
        type: 'error',
        message: `Discrepancy reported for ${reportingErrorCandidate.applicantName || reportingErrorCandidate.name} (Barcode: ${reportingErrorCandidate.barcodeNumber}). Transferred to the Error Reported Applicants box below.`,
      });
      setReportingErrorCandidate(null);
      setTimeout(() => setNotification(null), 4000);
    } catch {
      setNotification({ type: 'error', message: 'Failed to submit error report.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Deny Admission Modal
  const openDenyAdmission = (candidate: MeritRecord) => {
    setDenyingAdmissionCandidate(candidate);
    setSelectedDenyReason(COMMON_DENIAL_REASONS[0]);
    if (candidate.notes && candidate.notes.includes('ADMISSION DENIED')) {
      setDenyCustomRemarks(candidate.notes);
    } else {
      setDenyCustomRemarks('');
    }
  };

  // Submit Deny Admission
  const handleSubmitDenyAdmission = async () => {
    if (!denyingAdmissionCandidate) return;
    setIsSubmitting(true);
    const now = new Date();
    const officerDesc = adminSession ? `${adminSession.name} (${adminSession.desk || 'Verification Desk'})` : 'Verifying Officer';

    const fullReason = denyCustomRemarks.trim()
      ? `${selectedDenyReason}. Remarks: ${denyCustomRemarks.trim()}`
      : selectedDenyReason;

    const updated: MeritRecord = {
      ...denyingAdmissionCandidate,
      status: 'Rejected',
      notes: `ADMISSION DENIED by ${officerDesc} on ${now.toLocaleDateString('en-IN')} at ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}. Reason: ${fullReason}`,
      updatedAt: now.toISOString(),
    };

    try {
      await onUpdateRecord(updated);
      setNotification({
        type: 'error',
        message: `Admission DENIED for ${denyingAdmissionCandidate.applicantName || denyingAdmissionCandidate.name} (Barcode: ${denyingAdmissionCandidate.barcodeNumber}). Transferred to the Admission Denied Applicants box below.`,
      });
      setDenyingAdmissionCandidate(null);
      setTimeout(() => setNotification(null), 4000);
    } catch {
      setNotification({ type: 'error', message: 'Failed to deny admission.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear Denial and return to Reported status
  const handleClearDenial = async () => {
    if (!denyingAdmissionCandidate) return;
    await handleRevertToPending(denyingAdmissionCandidate);
    setDenyingAdmissionCandidate(null);
  };

  // Mark applicant as Verified
  const handleMarkVerified = async (candidate: MeritRecord) => {
    setIsSubmitting(true);
    const now = new Date();
    const officerDesc = adminSession ? `${adminSession.name} (${adminSession.desk || 'Verification Desk'})` : 'Verifying Officer';
    
    const updated: MeritRecord = {
      ...candidate,
      status: 'Reported & Verified',
      notes: `Documents verified & approved by ${officerDesc} on ${now.toLocaleDateString('en-IN')} at ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}. Eligibility confirmed.`,
      updatedAt: now.toISOString(),
    };

    try {
      await onUpdateRecord(updated);
      setNotification({
        type: 'success',
        message: `Applicant ${candidate.applicantName || candidate.name} (Barcode ${candidate.barcodeNumber}) marked as VERIFIED. Transferred to Verified Applicants box below & OIC Roll Number console.`,
      });
      setTimeout(() => setNotification(null), 4000);
    } catch {
      setNotification({ type: 'error', message: 'Failed to update verification record.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Revert back to Reported (Pending Verification)
  const handleRevertToPending = async (candidate: MeritRecord) => {
    setIsSubmitting(true);
    const now = new Date();
    const officerDesc = adminSession ? `${adminSession.name}` : 'Verifying Officer';
    const updated: MeritRecord = {
      ...candidate,
      status: 'Reported',
      notes: `Verification reset to Reported queue by ${officerDesc} on ${now.toLocaleDateString('en-IN')}.`,
      updatedAt: now.toISOString(),
    };
    try {
      await onUpdateRecord(updated);
      setNotification({
        type: 'success',
        message: `Candidate ${candidate.applicantName || candidate.name} returned to Reporting Applicants Queue.`,
      });
      setTimeout(() => setNotification(null), 4000);
    } catch {
      setNotification({ type: 'error', message: 'Failed to reset record.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear Error and return to Reported status
  const handleClearError = async () => {
    if (!reportingErrorCandidate) return;
    await handleRevertToPending(reportingErrorCandidate);
    setReportingErrorCandidate(null);
  };

  // Export Verification Register to Excel
  const handleExportVerificationRegister = () => {
    if (filteredApplicants.length === 0) return;
    const filename = `Panchayat_College_Reporting_Verification_Register_${new Date().toISOString().split('T')[0]}.xlsx`;
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
              <FileCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white font-outfit tracking-tight">
                  Verification Officer Console
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono">
                  Physical Scrutiny & Document Audit
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Panchayat College, Bargarh · SAMS UG e-Admission 2026-27 · Document Verification Counter
              </p>
            </div>
          </div>

          {/* Active Officer Designation Badge */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="bg-[#070b0e] border border-cyan-900/60 rounded-xl px-4 py-2 flex items-center gap-2.5 text-xs font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              <div>
                <div className="font-semibold text-white">
                  {adminSession?.name || 'Verifying Officer'}
                </div>
                <div className="text-[11px] text-cyan-400/90 truncate max-w-[220px]">
                  {adminSession?.desk || 'Central Verification Desk'}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-cyan-950/50">
          <div className="bg-[#070b0e]/80 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 uppercase font-mono block">Total Reporting</span>
            <span className="text-2xl font-black text-white font-mono">{stats.total}</span>
          </div>

          <div className="bg-[#070b0e]/80 border border-amber-500/30 rounded-xl p-3">
            <span className="text-[11px] text-amber-400 uppercase font-mono block flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>Awaiting Verification</span>
            </span>
            <span className="text-2xl font-black text-amber-300 font-mono">{stats.pending}</span>
          </div>

          <div className="bg-[#070b0e]/80 border border-emerald-500/30 rounded-xl p-3">
            <span className="text-[11px] text-emerald-400 uppercase font-mono block flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Verified</span>
            </span>
            <span className="text-2xl font-black text-emerald-300 font-mono">{stats.verified}</span>
          </div>

          <div className="bg-[#070b0e]/80 border border-cyan-500/30 rounded-xl p-3">
            <span className="text-[11px] text-cyan-400 uppercase font-mono block flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-cyan-400" />
              <span>Confirmed Seats</span>
            </span>
            <span className="text-2xl font-black text-cyan-300 font-mono">{stats.confirmed}</span>
          </div>

          <div className="bg-[#070b0e]/80 border border-rose-500/30 rounded-xl p-3">
            <span className="text-[11px] text-rose-400 uppercase font-mono block flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Error Reported</span>
            </span>
            <span className="text-2xl font-black text-rose-300 font-mono">{stats.flagged}</span>
          </div>

          <div className="bg-[#070b0e]/80 border border-red-500/30 rounded-xl p-3">
            <span className="text-[11px] text-red-400 uppercase font-mono block flex items-center gap-1">
              <UserX className="w-3 h-3 text-red-400" />
              <span>Admission Denied</span>
            </span>
            <span className="text-2xl font-black text-red-300 font-mono">{stats.denied}</span>
          </div>
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
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Control Bar: Search & Filters */}
      <div className="bg-[#0b1016] border border-cyan-950/60 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reporting candidates by Barcode, Token No, Name, Subject, or Mobile..."
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
              <option value="All">All Statuses ({reportingApplicants.length})</option>
              <option value="Pending">Awaiting Verification ({stats.pending})</option>
              <option value="Verified">Verified ({stats.verified})</option>
              <option value="Confirmed">Admission Confirmed ({stats.confirmed})</option>
              <option value="Flagged">Error Reported ({stats.flagged})</option>
              <option value="Denied">Admission Denied ({stats.denied})</option>
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
              <option value="Science">Science</option>
              <option value="Arts">Arts</option>
              <option value="Commerce">Commerce</option>
            </select>
          </div>

          {/* Date Filter */}
          {availableDates.length > 0 && (
            <div className="bg-[#070b0e] border border-slate-800 rounded-lg px-2.5 py-1.5">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-300 focus:outline-none font-medium cursor-pointer"
              >
                <option value="All">All Reporting Dates</option>
                {availableDates.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Export to Excel */}
          <button
            onClick={handleExportVerificationRegister}
            disabled={filteredApplicants.length === 0}
            className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            title="Download Excel register of reporting candidates"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Export Register</span>
          </button>
        </div>
      </div>

      {/* 1. Main Box: Reporting Applicants Queue (Awaiting Verification) */}
      <div className="bg-[#0b1016] border border-cyan-950/60 rounded-xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-cyan-950/50 bg-[#070b0e] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            <h2 className="text-sm font-bold text-white font-outfit">
              Reporting Applicants Queue ({queueApplicants.length})
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-950/80 border border-amber-500/40 text-amber-300">
              Awaiting Verification Action
            </span>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
            <span>Choose verification action:</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-semibold text-[11px]">1. Verified</span>
            <span className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-300 font-semibold text-[11px]">2. Error Reported</span>
            <span className="px-1.5 py-0.5 rounded bg-red-950/80 border border-red-500/40 text-red-300 font-semibold text-[11px]">3. Deny Admission</span>
          </div>
        </div>

        {queueApplicants.length === 0 ? (
          <div className="p-10 text-center text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <FileCheck className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-200">
              {reportingApplicants.length === 0
                ? 'No applicants have reported in the OIC Reporting Console yet.'
                : 'All reported applicants in the queue have been processed!'}
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {reportingApplicants.length === 0
                ? 'Only candidates who physically report and are marked "Reported" by an OIC Reporting Desk appear here for certificate scrutiny.'
                : 'All candidates have been transferred to the Verified, Error Reported, or Admission Denied boxes below. New reported candidates will arrive here automatically.'}
            </p>
            {reportingApplicants.length === 0 && onOpenOicReporting && (
              <button
                onClick={onOpenOicReporting}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.15)]"
              >
                <span>Open OIC Reporting Console →</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-[#070b0e] text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-mono">
                <tr>
                  <th className="py-3 px-3.5 text-center">Token No</th>
                  <th className="py-3 px-3">Sl No</th>
                  <th className="py-3 px-3">Barcode No</th>
                  <th className="py-3 px-3">Applicant Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Stream & Major Subject</th>
                  <th className="py-3 px-3 text-right">Mark (%)</th>
                  <th className="py-3 px-3">Reporting Time</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3.5 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {queueApplicants.map((candidate, idx) => (
                  <tr 
                    key={candidate.id || candidate.barcodeNumber}
                    className={`hover:bg-slate-900/60 transition-colors ${
                      denyingAdmissionCandidate?.barcodeNumber === candidate.barcodeNumber
                        ? 'bg-red-950/30'
                        : reportingErrorCandidate?.barcodeNumber === candidate.barcodeNumber 
                        ? 'bg-rose-950/25' 
                        : ''
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
                          onClick={() => handleCopyBarcode(candidate.barcodeNumber)}
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

                    {/* 8. Reporting Date & Time */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                      <div>{candidate.reportingDate || candidate.admissionDate || 'Today'}</div>
                      <div className="text-[10px] text-slate-500">{candidate.reportingTime || 'Morning Shift'}</div>
                    </td>

                    {/* 9. Verification Status */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/40 animate-pulse">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>Awaiting Action</span>
                      </span>
                    </td>

                    {/* 10. Actions: 1st Verified, 2nd Error Reported, 3rd Deny Admission */}
                    <td className="py-2.5 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap sm:flex-nowrap">
                        {/* 1st Place: Verified Button -> Transfers to Verified Box */}
                        <button
                          onClick={() => handleMarkVerified(candidate)}
                          disabled={isSubmitting}
                          className="px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-[0_0_10px_rgba(16,185,129,0.25)] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Verify applicant documents and transfer to Verified box below & OIC Roll Number console"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                          <span>Verified</span>
                        </button>

                        {/* 2nd Place: Error Reported Button -> Transfers to Error Reported Box */}
                        <button
                          onClick={() => openErrorReport(candidate)}
                          disabled={isSubmitting}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-rose-950/50 border border-slate-700 hover:border-rose-500/60 text-slate-300 hover:text-rose-300 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                          title="Report document discrepancy and transfer to Error Reported box below"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Error Reported</span>
                        </button>

                        {/* 3rd Place: Deny Admission Button -> Transfers to Deny Admission Box */}
                        <button
                          onClick={() => openDenyAdmission(candidate)}
                          disabled={isSubmitting}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-red-950/50 border border-slate-700 hover:border-red-500/60 text-slate-300 hover:text-red-300 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                          title="Deny admission and transfer to Admission Denied box below"
                        >
                          <UserX className="w-3.5 h-3.5 text-red-400" />
                          <span>Deny Admission</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3 Dedicated Boxes Below Queue: Verified, Error Reported, Deny Admission  */}
      {/* ========================================================================= */}
      <div className="space-y-6 pt-2">
        
        {/* ===================================================================== */}
        {/* BOX 1: VERIFIED APPLICANTS                                            */}
        {/* ===================================================================== */}
        <div className="bg-[#0b1016] border border-emerald-500/40 rounded-xl overflow-hidden shadow-2xl relative">
          <div className="p-4 border-b border-emerald-950/50 bg-[#070b0e] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white font-outfit">
                    Verified Applicants
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                    {verifiedApplicants.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Transferred upon verification approval · Forwarded to OIC Roll Number Console
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenOicRollNo && canAccessOicRollNo && (
                <button
                  onClick={onOpenOicRollNo}
                  className="px-3 py-1.5 bg-teal-950/80 hover:bg-teal-900 border border-teal-500/40 text-teal-300 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(20,184,166,0.2)]"
                  title="View verified applicants in OIC Roll Number Console"
                >
                  <Hash className="w-3.5 h-3.5 text-teal-400" />
                  <span>Open OIC Roll Number Console →</span>
                </button>
              )}

              <button
                onClick={() => setIsVerifiedExpanded(!isVerifiedExpanded)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title={isVerifiedExpanded ? "Collapse verified box" : "Expand verified box"}
              >
                {isVerifiedExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isVerifiedExpanded && (
            verifiedApplicants.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/30 mx-auto" />
                <p className="text-xs font-medium text-slate-300">
                  No verified applicants in this section yet.
                </p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Click the <span className="text-emerald-400 font-semibold">"Verified"</span> button on any candidate in the Reporting Applicants Queue above to transfer their verified record here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-[#070b0e] text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-mono">
                    <tr>
                      <th className="py-2.5 px-3.5 text-center">Token No</th>
                      <th className="py-2.5 px-3">Sl No</th>
                      <th className="py-2.5 px-3">Barcode No</th>
                      <th className="py-2.5 px-3">Applicant Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Stream & Major Subject</th>
                      <th className="py-2.5 px-3 text-right">Mark (%)</th>
                      <th className="py-2.5 px-3">Verification Details</th>
                      <th className="py-2.5 px-3 text-center">College Roll No</th>
                      <th className="py-2.5 px-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {verifiedApplicants.map((candidate, idx) => (
                      <tr key={candidate.id || candidate.barcodeNumber} className="hover:bg-slate-900/60 transition-colors">
                        {/* Token No */}
                        <td className="py-2 px-3.5 text-center">
                          {candidate.tokenNumber ? (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-xs font-black font-mono bg-emerald-950 border border-emerald-400/60 text-emerald-300">
                              #{candidate.tokenNumber}
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-500">—</span>
                          )}
                        </td>

                        {/* Sl No */}
                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Barcode No */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-cyan-300 font-semibold text-xs">
                              {candidate.barcodeNumber}
                            </span>
                            <button
                              onClick={() => handleCopyBarcode(candidate.barcodeNumber)}
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

                        {/* Applicant Name */}
                        <td className="py-2 px-3">
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

                        {/* Category */}
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                            {candidate.socialCategory || candidate.category || 'GEN'}
                          </span>
                        </td>

                        {/* Stream & Major Subject */}
                        <td className="py-2 px-3">
                          <div className="text-xs">
                            <span className="font-semibold text-teal-300">{candidate.stream}</span>
                            <span className="text-slate-500 mx-1">·</span>
                            <span className="text-emerald-300 font-medium">{candidate.majorSubject || candidate.subject}</span>
                          </div>
                        </td>

                        {/* Mark % */}
                        <td className="py-2 px-3 text-right">
                          <span className="font-mono font-bold text-cyan-400 text-xs">
                            {candidate.percentage}%
                          </span>
                        </td>

                        {/* Verification Details */}
                        <td className="py-2 px-3 text-[11px] text-slate-400 font-sans max-w-[260px] truncate" title={candidate.notes}>
                          <div className="flex items-center gap-1 text-emerald-300 font-medium">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>Verified & Approved</span>
                          </div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            {candidate.notes || 'Documents verified'}
                          </div>
                        </td>

                        {/* Roll Number Status */}
                        <td className="py-2 px-3 text-center">
                          {candidate.rollNumber ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-cyan-950 border border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                              {candidate.rollNumber}
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              Awaiting Roll No
                            </span>
                          )}
                        </td>

                        {/* Revert Action */}
                        <td className="py-2 px-3.5 text-right">
                          <button
                            onClick={() => handleRevertToPending(candidate)}
                            disabled={isSubmitting}
                            className="px-2 py-1 bg-slate-900 hover:bg-amber-950/50 border border-slate-700 hover:border-amber-500/50 text-slate-400 hover:text-amber-300 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ml-auto cursor-pointer"
                            title="Revert candidate back to Reporting Applicants Queue for re-scrutiny"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Revert to Queue</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        {/* ===================================================================== */}
        {/* BOX 2: ERROR REPORTED APPLICANTS                                      */}
        {/* ===================================================================== */}
        <div className="bg-[#0b1016] border border-rose-500/40 rounded-xl overflow-hidden shadow-2xl relative">
          <div className="p-4 border-b border-rose-950/50 bg-[#070b0e] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.25)]">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white font-outfit">
                    Error Reported Applicants
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-rose-950 text-rose-300 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]">
                    {errorReportedApplicants.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Transferred when document discrepancies, missing CLC, or marksheet mismatches are reported
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsErrorExpanded(!isErrorExpanded)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title={isErrorExpanded ? "Collapse error reported box" : "Expand error reported box"}
              >
                {isErrorExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isErrorExpanded && (
            errorReportedApplicants.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <AlertTriangle className="w-10 h-10 text-rose-500/30 mx-auto" />
                <p className="text-xs font-medium text-slate-300">
                  No document errors reported.
                </p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Click the <span className="text-rose-400 font-semibold">"Error Reported"</span> button on any candidate in the queue above if discrepancies or missing certificates are detected during verification.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-[#070b0e] text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-mono">
                    <tr>
                      <th className="py-2.5 px-3.5 text-center">Token No</th>
                      <th className="py-2.5 px-3">Sl No</th>
                      <th className="py-2.5 px-3">Barcode No</th>
                      <th className="py-2.5 px-3">Applicant Name</th>
                      <th className="py-2.5 px-3">Stream & Subject</th>
                      <th className="py-2.5 px-3 text-right">Mark (%)</th>
                      <th className="py-2.5 px-3">Reported Deficiency / Defect</th>
                      <th className="py-2.5 px-3.5 text-right">Resolution Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {errorReportedApplicants.map((candidate, idx) => (
                      <tr key={candidate.id || candidate.barcodeNumber} className="hover:bg-slate-900/60 transition-colors bg-rose-950/10">
                        {/* Token No */}
                        <td className="py-2 px-3.5 text-center">
                          {candidate.tokenNumber ? (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-xs font-black font-mono bg-rose-950 border border-rose-400/60 text-rose-300">
                              #{candidate.tokenNumber}
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-500">—</span>
                          )}
                        </td>

                        {/* Sl No */}
                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Barcode No */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-cyan-300 font-semibold text-xs">
                              {candidate.barcodeNumber}
                            </span>
                            <button
                              onClick={() => handleCopyBarcode(candidate.barcodeNumber)}
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

                        {/* Applicant Name */}
                        <td className="py-2 px-3">
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

                        {/* Stream & Subject */}
                        <td className="py-2 px-3">
                          <div className="text-xs">
                            <span className="font-semibold text-teal-300">{candidate.stream}</span>
                            <span className="text-slate-500 mx-1">·</span>
                            <span className="text-rose-300 font-medium">{candidate.majorSubject || candidate.subject}</span>
                          </div>
                        </td>

                        {/* Mark % */}
                        <td className="py-2 px-3 text-right">
                          <span className="font-mono font-bold text-cyan-400 text-xs">
                            {candidate.percentage}%
                          </span>
                        </td>

                        {/* Reported Deficiency / Defect */}
                        <td className="py-2 px-3 max-w-[340px]">
                          <div className="text-xs text-rose-300 font-medium flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span className="truncate">{extractDeficiencyReason(candidate.notes)}</span>
                          </div>
                          {candidate.notes && (
                            <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono" title={candidate.notes}>
                              {candidate.notes}
                            </div>
                          )}
                        </td>

                        {/* Resolution Actions */}
                        <td className="py-2 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Verify Now if rectified */}
                            <button
                              onClick={() => handleMarkVerified(candidate)}
                              disabled={isSubmitting}
                              className="px-2 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                              title="Discrepancy resolved: verify and transfer to Verified box"
                            >
                              <CheckCircle2 className="w-3 h-3 text-slate-950" />
                              <span>Verify Now</span>
                            </button>

                            {/* Edit Remarks */}
                            <button
                              onClick={() => openErrorReport(candidate)}
                              disabled={isSubmitting}
                              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
                              title="Edit discrepancy remarks"
                            >
                              Edit
                            </button>

                            {/* Revert to Queue */}
                            <button
                              onClick={() => handleRevertToPending(candidate)}
                              disabled={isSubmitting}
                              className="p-1 text-slate-400 hover:text-amber-300 hover:bg-amber-950/20 rounded-md transition-colors cursor-pointer"
                              title="Clear error and return to Reporting Applicants Queue"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        {/* ===================================================================== */}
        {/* BOX 3: ADMISSION DENIED APPLICANTS                                    */}
        {/* ===================================================================== */}
        <div className="bg-[#0b1016] border border-red-500/40 rounded-xl overflow-hidden shadow-2xl relative">
          <div className="p-4 border-b border-red-950/50 bg-[#070b0e] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.25)]">
                <UserX className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white font-outfit">
                    Admission Denied Applicants
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-red-950 text-red-300 border border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.2)]">
                    {deniedApplicants.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Transferred when admission is rejected due to ineligibility, forged papers, or voluntary opt-out
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDeniedExpanded(!isDeniedExpanded)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title={isDeniedExpanded ? "Collapse admission denied box" : "Expand admission denied box"}
              >
                {isDeniedExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isDeniedExpanded && (
            deniedApplicants.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <UserX className="w-10 h-10 text-red-500/30 mx-auto" />
                <p className="text-xs font-medium text-slate-300">
                  No admission denials recorded.
                </p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Click the <span className="text-red-400 font-semibold">"Deny Admission"</span> button on any candidate in the queue above to reject admission with mandatory documented justification.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-[#070b0e] text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-mono">
                    <tr>
                      <th className="py-2.5 px-3.5 text-center">Token No</th>
                      <th className="py-2.5 px-3">Sl No</th>
                      <th className="py-2.5 px-3">Barcode No</th>
                      <th className="py-2.5 px-3">Applicant Name</th>
                      <th className="py-2.5 px-3">Stream & Subject</th>
                      <th className="py-2.5 px-3 text-right">Mark (%)</th>
                      <th className="py-2.5 px-3">Reason for Denial & Remarks</th>
                      <th className="py-2.5 px-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {deniedApplicants.map((candidate, idx) => (
                      <tr key={candidate.id || candidate.barcodeNumber} className="hover:bg-slate-900/60 transition-colors bg-red-950/10">
                        {/* Token No */}
                        <td className="py-2 px-3.5 text-center">
                          {candidate.tokenNumber ? (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-xs font-black font-mono bg-red-950 border border-red-400/60 text-red-300">
                              #{candidate.tokenNumber}
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-500">—</span>
                          )}
                        </td>

                        {/* Sl No */}
                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Barcode No */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-cyan-300 font-semibold text-xs">
                              {candidate.barcodeNumber}
                            </span>
                            <button
                              onClick={() => handleCopyBarcode(candidate.barcodeNumber)}
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

                        {/* Applicant Name */}
                        <td className="py-2 px-3">
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

                        {/* Stream & Subject */}
                        <td className="py-2 px-3">
                          <div className="text-xs">
                            <span className="font-semibold text-teal-300">{candidate.stream}</span>
                            <span className="text-slate-500 mx-1">·</span>
                            <span className="text-red-300 font-medium">{candidate.majorSubject || candidate.subject}</span>
                          </div>
                        </td>

                        {/* Mark % */}
                        <td className="py-2 px-3 text-right">
                          <span className="font-mono font-bold text-cyan-400 text-xs">
                            {candidate.percentage}%
                          </span>
                        </td>

                        {/* Denial Reason & Notes */}
                        <td className="py-2 px-3 max-w-[340px]">
                          <div className="text-xs text-red-300 font-medium flex items-center gap-1.5">
                            <UserX className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            <span className="truncate">{extractDenialReason(candidate.notes)}</span>
                          </div>
                          {candidate.notes && (
                            <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono" title={candidate.notes}>
                              {candidate.notes}
                            </div>
                          )}
                        </td>

                        {/* Action: Reconsider / Revert to Queue */}
                        <td className="py-2 px-3.5 text-right">
                          <button
                            onClick={() => handleRevertToPending(candidate)}
                            disabled={isSubmitting}
                            className="px-2 py-1 bg-slate-900 hover:bg-amber-950/50 border border-slate-700 hover:border-amber-500/50 text-slate-400 hover:text-amber-300 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ml-auto cursor-pointer"
                            title="Undo admission denial and return candidate to Reporting Applicants Queue for re-evaluation"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reconsider / Revert</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

      </div>

      {/* Error Reporting Dialog Modal */}
      {reportingErrorCandidate && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn overflow-y-auto">
          <div className="bg-[#0b1016] border border-rose-800/80 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl space-y-0 my-auto">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-rose-950/60 bg-[#070b0e] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-outfit flex items-center gap-2">
                    <span>Report Verification Error</span>
                    {reportingErrorCandidate.tokenNumber && (
                      <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-cyan-950 border border-cyan-400/50 text-cyan-300">
                        Token #{reportingErrorCandidate.tokenNumber}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Record discrepancy or deficiency found during certificate scrutiny
                  </p>
                </div>
              </div>

              <button
                onClick={() => setReportingErrorCandidate(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Candidate Summary Pill */}
            <div className="p-4 bg-[#080d12] border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-mono">Applicant Name</span>
                <span className="font-bold text-white truncate block">{reportingErrorCandidate.applicantName || reportingErrorCandidate.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-mono">Barcode Number</span>
                <span className="font-mono text-cyan-300 font-semibold">{reportingErrorCandidate.barcodeNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-mono">Stream & Subject</span>
                <span className="font-semibold text-teal-300 truncate block">{reportingErrorCandidate.stream} - {reportingErrorCandidate.majorSubject || reportingErrorCandidate.subject}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-mono">+2 Mark %</span>
                <span className="font-mono font-bold text-cyan-400">{reportingErrorCandidate.percentage}%</span>
              </div>
            </div>

            {/* Form Body */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-rose-300 uppercase tracking-wider block mb-2">
                  Select Error / Deficiency Type
                </label>
                <div className="space-y-2">
                  {COMMON_VERIFICATION_ERRORS.map((errReason) => {
                    const isSelected = selectedErrorReason === errReason;
                    return (
                      <label
                        key={errReason}
                        onClick={() => setSelectedErrorReason(errReason)}
                        className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all border text-xs font-medium ${
                          isSelected
                            ? 'bg-rose-950/40 border-rose-500/60 text-rose-200 shadow-sm'
                            : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="errorReason"
                          checked={isSelected}
                          onChange={() => setSelectedErrorReason(errReason)}
                          className="mt-0.5 text-rose-500 focus:ring-rose-400"
                        />
                        <span className="leading-tight">{errReason}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Specific Remarks / Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Officer Remarks & Specific Discrepancy Details
                </label>
                <textarea
                  rows={3}
                  value={errorCustomNotes}
                  onChange={(e) => setErrorCustomNotes(e.target.value)}
                  placeholder="e.g. CAF percentage mentioned as 78% but CHSE Marksheet shows 64%. Or Caste certificate produced was expired."
                  className="w-full bg-[#070b0e] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-400 font-mono"
                />
              </div>

              {/* Previous notes if any */}
              {reportingErrorCandidate.notes && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block mb-1">Current Notes / History:</span>
                  <p className="text-slate-300 font-mono text-[11px] leading-relaxed">{reportingErrorCandidate.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-[#070b0e] border-t border-rose-950/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReportingErrorCandidate(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                {/* Option to clear error if already flagged */}
                {isCandidateFlagged(reportingErrorCandidate) && (
                  <button
                    type="button"
                    onClick={handleClearError}
                    disabled={isSubmitting}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Clear Error (Revert)</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleSubmitErrorReport}
                disabled={isSubmitting}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Confirm & Report Error</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Deny Admission Confirmation Modal */}
      {denyingAdmissionCandidate && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn overflow-y-auto">
          <div className="bg-[#0b1016] border border-red-800/80 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl space-y-0 my-auto">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-red-950/60 bg-[#070b0e] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-outfit flex items-center gap-2">
                    <span>Deny Candidate Admission</span>
                    {denyingAdmissionCandidate.tokenNumber && (
                      <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-cyan-950 border border-cyan-400/50 text-cyan-300">
                        Token #{denyingAdmissionCandidate.tokenNumber}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Official rejection and disqualification from SAMS UG admission process
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDenyingAdmissionCandidate(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Candidate Summary Pill */}
            <div className="p-4 bg-[#080d12] border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-mono">Applicant Name</span>
                <span className="font-bold text-white truncate block">{denyingAdmissionCandidate.applicantName || denyingAdmissionCandidate.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-mono">Barcode Number</span>
                <span className="font-mono text-cyan-300 font-semibold">{denyingAdmissionCandidate.barcodeNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-mono">Stream & Subject</span>
                <span className="font-semibold text-teal-300 truncate block">{denyingAdmissionCandidate.stream} - {denyingAdmissionCandidate.majorSubject || denyingAdmissionCandidate.subject}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-mono">+2 Mark %</span>
                <span className="font-mono font-bold text-cyan-400">{denyingAdmissionCandidate.percentage}%</span>
              </div>
            </div>

            {/* Form Body */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-red-300 uppercase tracking-wider block mb-2">
                  Select Reason for Denying Admission
                </label>
                <div className="space-y-2">
                  {COMMON_DENIAL_REASONS.map((reason) => {
                    const isSelected = selectedDenyReason === reason;
                    return (
                      <label
                        key={reason}
                        onClick={() => setSelectedDenyReason(reason)}
                        className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all border text-xs font-medium ${
                          isSelected
                            ? 'bg-red-950/40 border-red-500/60 text-red-200 shadow-sm'
                            : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="denyReason"
                          checked={isSelected}
                          onChange={() => setSelectedDenyReason(reason)}
                          className="mt-0.5 text-red-500 focus:ring-red-400"
                        />
                        <span className="leading-tight">{reason}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Specific Remarks / Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Official Disqualification Order / Remarks
                </label>
                <textarea
                  rows={3}
                  value={denyCustomRemarks}
                  onChange={(e) => setDenyCustomRemarks(e.target.value)}
                  placeholder="e.g. Candidate failed to produce original Marksheet and CLC before the reporting cut-off. Admission denied as per SAMS Odisha guidelines."
                  className="w-full bg-[#070b0e] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-400 font-mono"
                />
              </div>

              {/* Previous notes if any */}
              {denyingAdmissionCandidate.notes && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block mb-1">Current Notes / History:</span>
                  <p className="text-slate-300 font-mono text-[11px] leading-relaxed">{denyingAdmissionCandidate.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-[#070b0e] border-t border-red-950/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDenyingAdmissionCandidate(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                {/* Option to clear denial if already denied */}
                {isCandidateDenied(denyingAdmissionCandidate) && (
                  <button
                    type="button"
                    onClick={handleClearDenial}
                    disabled={isSubmitting}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Clear Denial (Revert)</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleSubmitDenyAdmission}
                disabled={isSubmitting}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(239,68,68,0.35)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <UserX className="w-4 h-4" />
                <span>Confirm & Deny Admission</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
