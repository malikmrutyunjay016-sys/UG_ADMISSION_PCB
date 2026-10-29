import React, { useState } from 'react';
import { MeritRecord, RoundType, StreamType, CandidateStatus } from '../types/admission';
import { parseExcelFile, exportCandidatesToExcel, downloadSampleTemplate } from '../utils/excelParser';
import { 
  X, 
  Search, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  UserX, 
  Download, 
  Check, 
  Phone, 
  Mail, 
  Copy, 
  Filter, 
  ShieldCheck, 
  Printer, 
  FileText, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { AdminSession } from './AdminLoginModal';

interface OicReportingConsoleProps {
  isOpen?: boolean;
  onClose?: () => void;
  records: MeritRecord[];
  onUpdateRecord: (updated: MeritRecord) => Promise<void>;
  onAddRecords: (newRecords: MeritRecord[]) => Promise<void>;
  adminSession: AdminSession | null;
  onOpenAdminPortal?: () => void;
}

export const OicReportingConsole: React.FC<OicReportingConsoleProps> = ({
  isOpen,
  onClose,
  records,
  onUpdateRecord,
  onAddRecords,
  adminSession,
  onOpenAdminPortal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStream, setSelectedStream] = useState<string>('All');
  const [selectedRound, setSelectedRound] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Quick excel upload state inside reporting console
  const [isUploading, setIsUploading] = useState(false);
  const [uploadRound, setUploadRound] = useState<RoundType>('selection_round_1');
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Selected student for detailed certificate verification
  const [inspectingCandidate, setInspectingCandidate] = useState<MeritRecord | null>(null);
  const [defectReason, setDefectReason] = useState('Original CLC / Transfer Certificate missing');

  if (isOpen === false) return null;

  // Handle direct Excel Upload from OIC Reporting Console
  const handleDirectExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const result = await parseExcelFile(file, uploadRound);
      const isSelection = uploadRound === 'selection_round_1' || uploadRound === 'selection_round_2';
      const formatted = result.candidates.map((c) => ({
        ...c,
        roundType: uploadRound,
        status: c.status || (isSelection ? 'Selected' : 'Spot Eligible'),
        updatedAt: new Date().toISOString()
      }));
      await onAddRecords(formatted);
      setUploadSuccess(`Successfully ingested ${formatted.length} students from Excel into ${uploadRound.replace(/_/g, ' ').toUpperCase()}! Data is now live.`);
      setTimeout(() => setUploadSuccess(null), 5000);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to parse Excel spreadsheet');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Quick action: Mark as Reported
  const handleMarkReported = async (candidate: MeritRecord) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    
    const updated: MeritRecord = {
      ...candidate,
      status: 'Reported',
      admissionDate: dateStr,
      reportingDate: dateStr,
      reportingTime: timeStr,
      notes: `Reported at ${adminSession?.desk || 'OIC Desk'} on ${dateStr} at ${timeStr}`,
      updatedAt: now.toISOString()
    };
    await onUpdateRecord(updated);
  };

  // Undo report confirmation dialog state
  const [candidateToUndo, setCandidateToUndo] = useState<MeritRecord | null>(null);

  const handleConfirmUndoReport = async () => {
    if (!candidateToUndo) return;
    const now = new Date();
    const updated: MeritRecord = {
      ...candidateToUndo,
      status: 'Selected',
      admissionDate: '',
      reportingDate: '',
      reportingTime: '',
      notes: `Reporting reverted / undone by ${adminSession?.name || 'OIC'} on ${now.toLocaleDateString('en-IN')}`,
      updatedAt: now.toISOString()
    };
    await onUpdateRecord(updated);
    setCandidateToUndo(null);
  };

  // Quick action: Mark as Absent
  const handleMarkAbsent = async (candidate: MeritRecord) => {
    const updated: MeritRecord = {
      ...candidate,
      status: 'Absent',
      notes: `Candidate did not report within stipulated hours on ${candidate.reportingDate || 'scheduled date'}. Marked absent by ${adminSession?.name || 'OIC'}.`,
      updatedAt: new Date().toISOString()
    };
    await onUpdateRecord(updated);
    if (inspectingCandidate?.id === candidate.id) {
      setInspectingCandidate(updated);
    }
  };

  // Quick action: Flag Defective
  const handleFlagDefective = async (candidate: MeritRecord, reason: string) => {
    const updated: MeritRecord = {
      ...candidate,
      status: 'Document Verification Pending',
      notes: `Defective / Pending: ${reason}. Verification held by ${adminSession?.name || 'OIC'}.`,
      updatedAt: new Date().toISOString()
    };
    await onUpdateRecord(updated);
    if (inspectingCandidate?.id === candidate.id) {
      setInspectingCandidate(updated);
    }
  };

  const handleCopyBarcode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtering
  const filteredRecords = records.filter((r) => {
    // Search query matching Barcode, Name, Mobile, Email, Subject
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchBarcode = (r.barcodeNumber || '').toLowerCase().includes(q);
      const matchName = (r.name || '').toLowerCase().includes(q);
      const matchMobile = (r.mobile || '').toLowerCase().includes(q);
      const matchEmail = (r.email || '').toLowerCase().includes(q);
      const matchSubject = (r.subject || '').toLowerCase().includes(q);
      if (!matchBarcode && !matchName && !matchMobile && !matchEmail && !matchSubject) {
        return false;
      }
    }

    // Stream filter
    if (selectedStream !== 'All' && r.stream !== selectedStream) {
      return false;
    }

    // Round filter
    if (selectedRound !== 'All' && r.roundType !== selectedRound) {
      return false;
    }

    // Status filter
    if (selectedStatus !== 'All') {
      if (selectedStatus === 'Reported & Verified') {
        return r.status === 'Reported & Verified' || r.status === 'Admission Confirmed';
      }
      if (selectedStatus === 'Pending') {
        return r.status !== 'Reported & Verified' && r.status !== 'Admission Confirmed' && r.status !== 'Absent' && r.status !== 'Rejected';
      }
      if (selectedStatus === 'Absent') {
        return r.status === 'Absent' || r.status === 'Rejected';
      }
    }

    return true;
  });

  // Calculate live statistics
  const totalCount = records.length;
  const reportedCount = records.filter(
    (r) => r.status === 'Reported & Verified' || r.status === 'Admission Confirmed'
  ).length;
  const pendingCount = records.filter(
    (r) => r.status !== 'Reported & Verified' && r.status !== 'Admission Confirmed' && r.status !== 'Absent' && r.status !== 'Rejected'
  ).length;
  const absentCount = records.filter((r) => r.status === 'Absent' || r.status === 'Rejected').length;

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
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">Panchayat College Bargarh · Official OIC Desk</span>
          {onOpenAdminPortal && (
            <button
              onClick={onOpenAdminPortal}
              className="text-xs text-cyan-300 hover:text-white bg-cyan-950/80 border border-cyan-500/40 px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-medium hover:border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Go to Admin Console →</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#0b1016] border border-cyan-800/60 rounded-2xl w-full shadow-2xl overflow-hidden">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-cyan-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#070b0e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)] shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white font-outfit tracking-wide">
                  OIC Reporting Console
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                  Physical Verification Desk
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Panchayat Autonomous College, Bargarh · Session 2026-27 · {adminSession?.name || 'Officer in Charge'} ({adminSession?.desk || 'Desk 1'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Export Button */}
            <button
              onClick={() => exportCandidatesToExcel(filteredRecords, 'Panchayat_College_Reporting_Verification_List.xlsx')}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export Current Filtered List to Excel"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            {onOpenAdminPortal && (
              <button
                onClick={onOpenAdminPortal}
                className="px-3 py-1.5 bg-cyan-950/60 border border-cyan-500/40 hover:bg-cyan-900/40 text-cyan-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin Excel</span>
              </button>
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Return to Home
              </button>
            )}
          </div>
        </div>

        {/* Live Notification for Excel Upload */}
        {uploadSuccess && (
          <div className="bg-emerald-950/80 border-b border-emerald-500/40 px-4 py-2.5 flex items-center gap-2 text-xs text-emerald-200 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
        )}
        {uploadError && (
          <div className="bg-rose-950/80 border-b border-rose-500/40 px-4 py-2.5 flex items-center gap-2 text-xs text-rose-200 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Top Summary Bar & Quick Ingestion Strip */}
        <div className="p-4 sm:p-5 bg-[#090e13] border-b border-cyan-950/40 space-y-4">
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0c1219] border border-cyan-950/70 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-slate-400">Total Ingested Students</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-bold font-mono text-white">{totalCount}</span>
                <span className="text-[10px] text-cyan-400">Reflected from Excel</span>
              </div>
            </div>

            <div className="bg-[#0c1219] border border-emerald-950/70 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Reported & Verified</span>
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">{reportedCount}</span>
                <span className="text-[10px] text-slate-400">
                  {totalCount > 0 ? `${Math.round((reportedCount / totalCount) * 100)}%` : '0%'}
                </span>
              </div>
            </div>

            <div className="bg-[#0c1219] border border-amber-950/70 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-amber-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Reporting</span>
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-bold font-mono text-amber-400">{pendingCount}</span>
                <span className="text-[10px] text-slate-400">Awaiting desk review</span>
              </div>
            </div>

            <div className="bg-[#0c1219] border border-rose-950/70 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-rose-400 flex items-center gap-1">
                <UserX className="w-3.5 h-3.5" />
                <span>Absent / Defective</span>
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-bold font-mono text-rose-400">{absentCount}</span>
                <span className="text-[10px] text-slate-400">Action taken</span>
              </div>
            </div>
          </div>

          {/* Excel Reflection Notification & Direct Quick Upload Bar */}
          <div className="bg-[#070b0e] border border-cyan-800/40 rounded-xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-white">Live SAMS Excel Sync:</span>{' '}
                <span className="text-slate-400">
                  Whenever an Excel sheet is uploaded by the admin, all students (Barcode, Name, Mobile, Email, Stream & Honours) instantly appear here in real time.
                </span>
              </div>
            </div>

            {/* Direct Excel file ingestion input */}
            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
              <select
                value={uploadRound}
                onChange={(e) => setUploadRound(e.target.value as RoundType)}
                className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:border-cyan-500 focus:outline-none"
                title="Select Round to Ingest Into"
              >
                <option value="selection_round_1">Selection Round 1</option>
                <option value="selection_round_2">Selection Round 2</option>
                <option value="spot_round_1">Spot Round</option>
                <option value="waiting_list">Waiting List</option>
              </select>

              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.25)] whitespace-nowrap">
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploading ? 'Ingesting...' : 'Upload Excel Sheet'}</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleDirectExcelUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => downloadSampleTemplate('Reporting_Rounds')}
                title="Download Excel Sample Template"
                className="p-1.5 text-slate-400 hover:text-cyan-300 border border-slate-800 rounded-lg hover:bg-slate-800/80 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search and Filters Strip */}
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Barcode, Student Name, Mobile Number, or Email..."
                className="w-full bg-[#070b0e] border border-cyan-950/70 focus:border-cyan-500/80 text-xs sm:text-sm text-slate-100 pl-10 pr-8 py-2 rounded-xl focus:outline-none placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter: Stream */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={selectedStream}
                onChange={(e) => setSelectedStream(e.target.value)}
                className="bg-[#070b0e] border border-cyan-950/70 text-xs text-slate-200 rounded-xl px-3 py-2 focus:border-cyan-500 focus:outline-none flex-1 md:flex-none"
              >
                <option value="All">All Streams</option>
                <option value="Science">Science</option>
                <option value="Arts">Arts</option>
                <option value="Commerce">Commerce</option>
              </select>

              {/* Filter: Round */}
              <select
                value={selectedRound}
                onChange={(e) => setSelectedRound(e.target.value)}
                className="bg-[#070b0e] border border-cyan-950/70 text-xs text-slate-200 rounded-xl px-3 py-2 focus:border-cyan-500 focus:outline-none flex-1 md:flex-none font-medium"
              >
                <option value="All">All Rounds ({records.length})</option>
                <option value="selection_round_1">
                  Selection Round 1 ({records.filter((r) => r.roundType === 'selection_round_1').length})
                </option>
                <option value="selection_round_2">
                  Selection Round 2 ({records.filter((r) => r.roundType === 'selection_round_2').length})
                </option>
                <option value="spot_round_1">
                  Spot Round ({records.filter((r) => r.roundType === 'spot_round_1').length})
                </option>
                <option value="waiting_list">
                  Waiting List ({records.filter((r) => r.roundType === 'waiting_list').length})
                </option>
              </select>

              {/* Filter: Status */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-[#070b0e] border border-cyan-950/70 text-xs text-slate-200 rounded-xl px-3 py-2 focus:border-cyan-500 focus:outline-none flex-1 md:flex-none"
              >
                <option value="All">All Statuses</option>
                <option value="Reported & Verified">Reported & Verified</option>
                <option value="Pending">Pending Reporting</option>
                <option value="Absent">Absent / Defective</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content Area: Candidate Table with Action Controls */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {filteredRecords.length === 0 ? (
            <div className="bg-[#070b0e] border border-cyan-950/50 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
              <FileSpreadsheet className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="text-base font-semibold text-slate-300">No student records found</h3>
              <p className="text-xs text-slate-500 max-w-md mt-1">
                {searchQuery || selectedStream !== 'All' || selectedRound !== 'All'
                  ? 'No students match the current filters. Try resetting the search or filter options.'
                  : 'No Excel sheet has been uploaded yet. Use the "Upload Excel Sheet" button above to ingest the student merit list.'}
              </p>
              {(searchQuery || selectedStream !== 'All' || selectedRound !== 'All' || selectedStatus !== 'All') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStream('All');
                    setSelectedRound('All');
                    setSelectedStatus('All');
                  }}
                  className="mt-4 px-3 py-1.5 bg-slate-800 text-cyan-300 text-xs rounded-lg hover:bg-slate-700"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="border border-cyan-950/60 rounded-xl overflow-hidden bg-[#070b0e]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                  <thead className="bg-[#080d12] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-cyan-950/60 sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-3 font-semibold">1. Barcode No</th>
                      <th className="py-3 px-3 font-semibold">2. Applicant Name</th>
                      <th className="py-3 px-3 font-semibold">3. Admission Date</th>
                      <th className="py-3 px-3 font-semibold">4. Mark(%)</th>
                      <th className="py-3 px-3 font-semibold">5 & 6. Social / Selection Cat</th>
                      <th className="py-3 px-3 font-semibold">7. Mobile Number</th>
                      <th className="py-3 px-3 font-semibold">8. Board Name</th>
                      <th className="py-3 px-3 font-semibold">9 & 10. Stream / Major Subject</th>
                      <th className="py-3 px-3 font-semibold">Current Status</th>
                      <th className="py-3 px-3 font-semibold text-right">OIC Reporting Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-950/30 text-slate-300">
                    {filteredRecords.map((c) => {
                      const isReported = c.status === 'Reported' || c.status === 'Reported & Verified' || c.status === 'Admission Confirmed';
                      const isAbsent = c.status === 'Absent' || c.status === 'Rejected';

                      return (
                        <tr 
                          key={c.id} 
                          className="hover:bg-cyan-950/20 transition-colors group"
                        >
                          {/* 1. Barcode No */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-cyan-300 font-bold tracking-wider">
                                {c.barcodeNumber}
                              </span>
                              <button
                                onClick={() => handleCopyBarcode(c.barcodeNumber)}
                                className="text-slate-500 hover:text-cyan-400 transition-colors p-0.5"
                                title="Copy Barcode"
                              >
                                {copiedId === c.barcodeNumber ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* 2. Applicant Name */}
                          <td className="py-3 px-3">
                            <div className="font-semibold text-white group-hover:text-cyan-300 transition-colors">
                              {c.applicantName || c.name}
                            </div>
                          </td>

                          {/* 3. Admission Date */}
                          <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-300">
                            <div>{c.admissionDate || c.reportingDate || '-'}</div>
                          </td>

                          {/* 4. Mark(%) */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-mono font-bold text-cyan-400 text-xs">
                              {c.percentage}%
                            </span>
                          </td>

                          {/* 5 & 6. Social Category & Selection Category */}
                          <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px]">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 mr-1" title="Social Category">
                              {c.socialCategory || c.category || 'GEN'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30" title="Selection Category">
                              {c.selectionCategory || 'UR'}
                            </span>
                          </td>

                          {/* 7. Mobile Number */}
                          <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-300">
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-cyan-400/80" />
                              <a href={`tel:${c.mobileNumber || c.mobile}`} className="hover:underline hover:text-cyan-300">
                                {c.mobileNumber || c.mobile}
                              </a>
                            </div>
                          </td>

                          {/* 8. Board Name */}
                          <td className="py-3 px-3 whitespace-nowrap text-slate-300 text-[11px]">
                            {c.boardName || 'CHSE, Odisha'}
                          </td>

                          {/* 9 & 10. Stream & Major Subject */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="text-teal-300 font-medium">
                              {c.stream}
                            </div>
                            <div className="text-[11px] text-emerald-300 font-mono font-semibold">
                              {c.majorSubject || c.subject}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {isReported ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-950/70 border border-emerald-500/40 text-emerald-300">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{c.status === 'Reported' ? 'Reported' : 'Reported & Verified'}</span>
                              </span>
                            ) : isAbsent ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-950/70 border border-rose-500/40 text-rose-300">
                                <UserX className="w-3 h-3" />
                                <span>Absent / Rejected</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-950/70 border border-amber-500/40 text-amber-300">
                                <Clock className="w-3 h-3" />
                                <span>{c.status}</span>
                              </span>
                            )}
                          </td>

                           {/* OIC Actions */}
                          <td className="py-3 px-3.5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Reported Button */}
                              <button
                                onClick={() => handleMarkReported(c)}
                                disabled={isReported}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                                  isReported
                                    ? 'bg-emerald-950/30 text-emerald-500/60 border border-emerald-900/30 cursor-default'
                                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                                }`}
                                title="Mark Candidate as Reported"
                              >
                                <Check className="w-3 h-3" />
                                <span>{isReported ? 'Reported' : 'Reported'}</span>
                              </button>

                              {/* Undo Button (if reported) */}
                              {isReported && (
                                <button
                                  onClick={() => setCandidateToUndo(c)}
                                  className="px-2 py-1 rounded-lg bg-amber-950/40 border border-amber-800/40 hover:bg-amber-900/50 text-amber-300 text-[11px] font-medium transition-colors cursor-pointer"
                                  title="Undo reporting status"
                                >
                                  Undo
                                </button>
                              )}

                              {/* Mark Absent */}
                              {!isAbsent && !isReported && (
                                <button
                                  onClick={() => handleMarkAbsent(c)}
                                  className="p-1.5 rounded-lg bg-rose-950/30 border border-rose-800/40 hover:bg-rose-900/40 text-rose-400 transition-colors cursor-pointer"
                                  title="Mark Absent"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-3 bg-[#070b0e] border-t border-cyan-950/40 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>
              Showing {filteredRecords.length} of {records.length} students across all SAMS Excel sheets
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-500">
            Panchayat Degree College e-Admission · Baragada, Odisha
          </div>
        </div>

      </div>

      {/* Candidate Document Inspection & Checklist Modal */}
      {inspectingCandidate && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0b1016] border border-cyan-700/60 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-cyan-950/50 flex items-center justify-between bg-[#070b0e]">
              <div>
                <h3 className="text-base font-bold text-white font-outfit">
                  Physical Reporting & Document Checklist
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {inspectingCandidate.name} · {inspectingCandidate.barcodeNumber}
                </p>
              </div>
              <button
                onClick={() => setInspectingCandidate(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              
              {/* Candidate Info Grid (10 SAMS Fields) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#070b0e] p-3.5 rounded-xl border border-cyan-950/60 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">1. Barcode No</span>
                  <p className="text-cyan-300 font-bold">{inspectingCandidate.barcodeNumber}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">2. Applicant Name</span>
                  <p className="text-white font-semibold font-sans">{inspectingCandidate.applicantName || inspectingCandidate.name}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">3. Admission Date</span>
                  <p className="text-slate-200">{inspectingCandidate.admissionDate || inspectingCandidate.reportingDate || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">4. Mark(%)</span>
                  <p className="text-cyan-400 font-bold">{inspectingCandidate.percentage}%</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">5. Social Category</span>
                  <p className="text-slate-200">{inspectingCandidate.socialCategory || inspectingCandidate.category || 'GEN'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">6. Selection Category</span>
                  <p className="text-teal-300">{inspectingCandidate.selectionCategory || 'UR'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">7. Mobile Number</span>
                  <p className="text-cyan-300">{inspectingCandidate.mobileNumber || inspectingCandidate.mobile}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">8. Board Name</span>
                  <p className="text-slate-300">{inspectingCandidate.boardName || 'CHSE, Odisha'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">9. Stream</span>
                  <p className="text-teal-300">{inspectingCandidate.stream}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">10. Major Subject</span>
                  <p className="text-emerald-300 font-semibold">{inspectingCandidate.majorSubject || inspectingCandidate.subject}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Admission Round</span>
                  <p className="text-slate-400">{inspectingCandidate.roundType.replace(/_/g, ' ').toUpperCase()}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Email Address</span>
                  <p className="text-slate-400 truncate" title={inspectingCandidate.email}>{inspectingCandidate.email}</p>
                </div>
              </div>

              {/* Physical Document Verification Checklist */}
              <div>
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2 font-mono">
                  Original Certificate Inspection Desk Checklist:
                </h4>
                <div className="space-y-2 bg-[#070b0e] p-3 rounded-xl border border-cyan-950/60">
                  {[
                    { label: 'Original College Leaving Certificate (CLC) / Transfer Certificate (TC)', mandatory: true },
                    { label: '10th Board Certificate / Date of Birth (DOB) Proof', mandatory: true },
                    { label: 'Higher Secondary (+2 / 12th) Original Marksheet & Pass Certificate', mandatory: true },
                    { label: 'Conduct / Character Certificate from Head of Institution last attended', mandatory: true },
                    { label: 'Caste / Reservation Certificate (for SC / ST / SEBC / PH applicants)', mandatory: inspectingCandidate.category !== 'GEN' },
                    { label: 'SAMS Common Application Form (CAF) printout & 4 passport size photos', mandatory: true }
                  ].map((item, idx) => (
                    <label key={idx} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-900/60 transition-colors cursor-pointer">
                      <input 
                        type="checkbox" 
                        defaultChecked={inspectingCandidate.status === 'Reported & Verified'} 
                        className="mt-0.5 accent-cyan-400 rounded" 
                      />
                      <div className="flex-1">
                        <span className="text-slate-200">{item.label}</span>
                        {item.mandatory && (
                          <span className="text-[10px] ml-1.5 text-amber-400 font-mono font-medium">[Mandatory]</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status & Remarks */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-300">Desk Remarks / Log:</span>
                <p className="bg-[#070b0e] border border-cyan-950/60 p-2.5 rounded-xl text-slate-400 text-xs font-mono">
                  {inspectingCandidate.notes || 'No remarks recorded yet.'}
                </p>
              </div>

              {/* Defective Flagging */}
              <div className="bg-rose-950/20 border border-rose-900/40 p-3 rounded-xl space-y-2">
                <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Flag Defective Documents or Put on Hold:</span>
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={defectReason}
                    onChange={(e) => setDefectReason(e.target.value)}
                    className="flex-1 bg-slate-900 border border-rose-900/60 text-xs text-rose-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="Original CLC / Transfer Certificate missing">Original CLC / Transfer Certificate missing</option>
                    <option value="Missing Original +2 Marksheet">Missing Original +2 Marksheet</option>
                    <option value="Caste / Category Certificate expired or defective">Caste / Category Certificate expired or defective</option>
                    <option value="Marks mismatch between SAMS CAF and original marksheet">Marks mismatch between SAMS CAF and original marksheet</option>
                    <option value="Discrepancy in Date of Birth">Discrepancy in Date of Birth</option>
                  </select>
                  <button
                    onClick={() => handleFlagDefective(inspectingCandidate, defectReason)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-xs transition-colors shrink-0"
                  >
                    Flag Defective
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-cyan-950/50 bg-[#070b0e] flex items-center justify-between">
              <button
                onClick={() => setInspectingCandidate(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleMarkReported(inspectingCandidate);
                    setInspectingCandidate(null);
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Verify Documents</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Undo Reporting Confirmation Dialog */}
      {candidateToUndo && (
        <div className="fixed inset-0 z-70 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0b1016] border border-amber-500/50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-amber-950/50 flex items-center justify-between bg-[#070b0e]">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertCircle className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white font-outfit">
                  Confirm Reporting Undo
                </h3>
              </div>
              <button onClick={() => setCandidateToUndo(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-slate-300">
              <p>
                Are you sure you want to undo the reporting status for candidate{' '}
                <strong className="text-white">{candidateToUndo.applicantName || candidateToUndo.name}</strong> ({candidateToUndo.barcodeNumber})?
              </p>
              <div className="bg-[#070b0e] p-3 rounded-xl border border-slate-800 text-[11px] font-mono space-y-1 text-slate-400">
                <div>Current Status: <span className="text-emerald-400 font-bold">{candidateToUndo.status}</span></div>
                <div>Reported Time: <span className="text-slate-200">{candidateToUndo.reportingTime || 'N/A'}</span></div>
                <div className="pt-1 text-amber-300">This will revert the status back to Selected and clear the reporting timestamp.</div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCandidateToUndo(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUndoReport}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                >
                  <span>Yes, Undo Reporting</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
