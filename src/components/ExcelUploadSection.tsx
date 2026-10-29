import React, { useState } from 'react';
import { MeritRecord, RoundType, StreamType, CandidateStatus } from '../types/admission';
import { parseExcelFile, downloadSampleTemplate } from '../utils/excelParser';
import { AdminSession } from './AdminLoginModal';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  RefreshCw, 
  ShieldCheck, 
  Layers, 
  ArrowRight,
  UserCheck,
  Lock,
  Download
} from 'lucide-react';

interface ExcelUploadSectionProps {
  records: MeritRecord[];
  onAddRecords: (newRecords: MeritRecord[]) => Promise<void>;
  isAdmin: boolean;
  adminSession?: AdminSession | null;
  onOpenLoginModal: () => void;
  onOpenOicReporting?: () => void;
}

export const ExcelUploadSection: React.FC<ExcelUploadSectionProps> = ({
  records,
  onAddRecords,
  isAdmin,
  adminSession,
  onOpenLoginModal,
  onOpenOicReporting,
}) => {
  const [targetRound, setTargetRound] = useState<RoundType>('selection_round_1');
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<{ candidates: MeritRecord[]; rawCount: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [reflectedOicInfo, setReflectedOicInfo] = useState<{ count: number; roundName: string } | null>(null);

  // Manual Add Form State
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualMobile, setManualMobile] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualStream, setManualStream] = useState<StreamType>('Science');
  const [manualSubject, setManualSubject] = useState('Physics');
  const [manualPercentage, setManualPercentage] = useState('85.5');
  const [manualRank, setManualRank] = useState('1');
  const [manualCategory, setManualCategory] = useState('GEN');
  const [manualStatus, setManualStatus] = useState<CandidateStatus>('Selected');

  // Handle Excel File upload
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

  // Confirm Import
  // Confirm Import
  const handleConfirmImport = async () => {
    if (!parsedPreview || parsedPreview.candidates.length === 0) return;

    setIsSaving(true);
    setParseError(null);
    try {
      const isSelection = targetRound === 'selection_round_1' || targetRound === 'selection_round_2';
      // Ensure records carry the chosen roundType and appropriate status for reporting desk
      const updatedCandidates = parsedPreview.candidates.map((c) => ({
        ...c,
        roundType: targetRound,
        status: c.status || (isSelection ? 'Selected' : 'Spot Eligible'),
        updatedAt: new Date().toISOString()
      }));

      await onAddRecords(updatedCandidates);

      const count = updatedCandidates.length;
      const roundLabel = targetRound === 'selection_round_1' 
        ? 'Selection Round 1' 
        : targetRound === 'selection_round_2' 
          ? 'Selection Round 2' 
          : targetRound === 'spot_round_1' 
            ? 'Spot Admission' 
            : 'Waiting List';

      setReflectedOicInfo({ count, roundName: roundLabel });
      setSuccessMessage(`Successfully imported ${count} students from "${file?.name || 'Excel'}" for ${roundLabel}! All candidate records are now reflected in the OIC Reporting Console.`);

      setParsedPreview(null);
      setFile(null);

      // Immediately open OIC Reporting Console so the user directly sees the reflected student records
      if (onOpenOicReporting) {
        onOpenOicReporting();
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to import records');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle manual submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim() || !manualName.trim()) {
      alert('Please provide Barcode Number and Candidate Name');
      return;
    }

    const newCandidate: MeritRecord = {
      id: `man_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      barcodeNumber: manualBarcode.trim().toUpperCase(),
      name: manualName.trim(),
      category: manualCategory,
      stream: manualStream,
      subject: manualSubject,
      roundType: targetRound,
      percentage: parseFloat(manualPercentage) || 0,
      mobile: manualMobile.trim() || '9876543210',
      email: manualEmail.trim() || `${manualBarcode.toLowerCase()}@example.com`,
      rank: parseInt(manualRank, 10) || 1,
      status: manualStatus,
      reportingDate: '2026-11-06',
      reportingTime: '10:00 AM - 01:00 PM',
      notes: 'Manually added candidate.',
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      await onAddRecords([newCandidate]);
      setShowManualForm(false);
      setSuccessMessage(`Candidate ${manualName} successfully added!`);
      setManualBarcode('');
      setManualName('');
      setManualMobile('');
      setManualEmail('');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add candidate');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#0b1016] border border-cyan-800/50 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
      {/* Top Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Component Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-950/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 font-mono">
              Central Admission Management
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono">
              SAMS Ingestion Engine
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-outfit">
            Upload SAMS Merit Excel Sheet
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Import official candidate spreadsheets (.xlsx, .xls, .csv). Uploaded student records will instantly reflect in the <strong>OIC Reporting Console</strong> for physical document verification and roll assignment.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {isAdmin ? (
            <div className="flex items-center gap-2 bg-[#070b0e] border border-emerald-500/40 px-3 py-1.5 rounded-xl">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <div className="text-left">
                <div className="text-[11px] font-bold text-white font-outfit leading-tight">
                  {adminSession?.name || 'Admin Officer'}
                </div>
                <div className="text-[10px] text-emerald-300 font-mono leading-tight">
                  {adminSession?.role || 'Super Admin'}
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="px-3.5 py-2 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Admin Login</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowManualForm(!showManualForm)}
            className="px-3 py-2 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showManualForm ? 'Hide Form' : '+ Add Single'}</span>
          </button>
        </div>
      </div>

      {/* Target Round Picker */}
      <div className="bg-[#070b0e] border border-cyan-950/70 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-300">Target Selection Round:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'selection_round_1', label: 'Selection Round 1 (Phase-I)' },
            { id: 'selection_round_2', label: 'Selection Round 2 (Phase-II)' },
            { id: 'spot_round_1', label: 'Spot Round' },
            { id: 'waiting_list', label: 'Waiting List' },
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setTargetRound(r.id as RoundType)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                targetRound === r.id
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-[#070b0e] shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drag & Drop File Input Area */}
      <div className="border-2 border-dashed border-cyan-800/40 hover:border-cyan-400/80 rounded-2xl p-8 text-center bg-[#070b0e]/70 transition-all group">
        <input
          type="file"
          id="homeExcelUploadInput"
          accept=".xlsx, .xls, .csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <label htmlFor="homeExcelUploadInput" className="cursor-pointer flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all">
            <Upload className="w-7 h-7" />
          </div>
          <div>
            <div className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
              {file ? file.name : 'Click to Browse or Drag & Drop SAMS Excel Sheet'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
            </p>
          </div>
          <div className="text-[11px] font-mono text-cyan-400/80 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-500/30">
            Expected Headers: Barcode Number, Name, Mobile, Email, Stream, Subject, Percentage, Rank
          </div>
        </label>
      </div>

      {/* Parsing Status */}
      {isParsing && (
        <div className="text-center py-4 text-xs text-cyan-400 flex items-center justify-center gap-2 bg-[#070b0e] rounded-xl border border-cyan-950 p-4">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Parsing SAMS spreadsheet records and validating candidate barcode data...</span>
        </div>
      )}

      {/* Error Alert */}
      {parseError && (
        <div className="bg-red-950/60 border border-red-500/40 rounded-xl p-4 flex items-center gap-3 text-xs text-red-300 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{parseError}</span>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-200 animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          {reflectedOicInfo && onOpenOicReporting && (
            <button
              type="button"
              onClick={onOpenOicReporting}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)] shrink-0 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Open OIC Reporting Console ↗</span>
            </button>
          )}
        </div>
      )}

      {/* Parsed Preview Table */}
      {parsedPreview && (
        <div className="bg-[#070b0e] border border-cyan-950/60 rounded-xl p-5 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-1">
              <div className="text-xs text-slate-200 font-bold flex items-center gap-2 flex-wrap">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>Extracted {parsedPreview.candidates.length} candidate rows from {file?.name}</span>
                {(targetRound === 'selection_round_1' || targetRound === 'selection_round_2') && (
                  <span className="text-[10px] font-mono font-medium text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Reflects to OIC Reporting Console
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Target Allocation: <strong className="text-white capitalize">{targetRound.replace(/_/g, ' ')}</strong>
              </p>
            </div>

            <button
              onClick={handleConfirmImport}
              disabled={isSaving}
              className="px-5 py-2.5 text-xs font-bold text-[#070b0e] bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 rounded-xl transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.35)] disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>
                {targetRound === 'selection_round_1' || targetRound === 'selection_round_2'
                  ? 'Confirm & Reflect to OIC Reporting Console'
                  : 'Confirm & Publish to Portal'}
              </span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-60 rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-[#0b1016] text-slate-400 sticky top-0 font-semibold border-b border-slate-800 text-[11px]">
                <tr>
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
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-[11px]">
                {parsedPreview.candidates.slice(0, 8).map((c, i) => (
                  <tr key={i} className="hover:bg-cyan-950/20">
                    <td className="py-2 px-3 text-cyan-300 font-semibold">{c.barcodeNumber}</td>
                    <td className="py-2 px-3 font-medium text-white font-sans">{c.applicantName || c.name}</td>
                    <td className="py-2 px-3 text-slate-300">{c.admissionDate || c.reportingDate || 'N/A'}</td>
                    <td className="py-2 px-3 font-bold text-cyan-400">{c.percentage}%</td>
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
                    <td className="py-2 px-3 font-sans text-slate-400">{c.boardName || 'CHSE, Odisha'}</td>
                    <td className="py-2 px-3 font-sans text-teal-300">{c.stream}</td>
                    <td className="py-2 px-3 font-sans text-emerald-300 font-semibold">{c.majorSubject || c.subject}</td>
                    <td className="py-2 px-3 font-sans text-slate-400">{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsedPreview.candidates.length > 6 && (
            <div className="text-[11px] text-slate-500 text-center pt-1 font-mono">
              + {parsedPreview.candidates.length - 6} additional candidate records ready to import
            </div>
          )}
        </div>
      )}

      {/* Manual Candidate Form (Collapsible) */}
      {showManualForm && (
        <form onSubmit={handleManualSubmit} className="bg-[#070b0e] border border-cyan-950/60 rounded-xl p-5 space-y-4 animate-fadeIn">
          <div className="text-xs font-bold text-cyan-300 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Manual Candidate Enrollment Form</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">SAMS Barcode Number *</label>
              <input
                type="text"
                required
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="e.g. 26D994101"
                className="w-full bg-[#0b1016] border border-slate-700 rounded-lg p-2 text-white font-mono uppercase focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Candidate Full Name"
                className="w-full bg-[#0b1016] border border-slate-700 rounded-lg p-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Mobile Contact</label>
              <input
                type="text"
                value={manualMobile}
                onChange={(e) => setManualMobile(e.target.value)}
                placeholder="10-digit Mobile"
                className="w-full bg-[#0b1016] border border-slate-700 rounded-lg p-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Email Address</label>
              <input
                type="email"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full bg-[#0b1016] border border-slate-700 rounded-lg p-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Stream</label>
              <select
                value={manualStream}
                onChange={(e) => setManualStream(e.target.value as StreamType)}
                className="w-full bg-[#0b1016] border border-slate-700 rounded-lg p-2 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="Science">Science</option>
                <option value="Arts">Arts</option>
                <option value="Commerce">Commerce</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Honours Subject</label>
              <input
                type="text"
                value={manualSubject}
                onChange={(e) => setManualSubject(e.target.value)}
                placeholder="e.g. Physics / Botany"
                className="w-full bg-[#0b1016] border border-slate-700 rounded-lg p-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Percentage %</label>
              <input
                type="number"
                step="0.01"
                value={manualPercentage}
                onChange={(e) => setManualPercentage(e.target.value)}
                className="w-full bg-[#0b1016] border border-slate-700 rounded-lg p-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Rank</label>
              <input
                type="number"
                value={manualRank}
                onChange={(e) => setManualRank(e.target.value)}
                className="w-full bg-[#0b1016] border border-slate-700 rounded-lg p-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowManualForm(false)}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-[#070b0e] bg-cyan-400 hover:bg-cyan-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Save Candidate</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
