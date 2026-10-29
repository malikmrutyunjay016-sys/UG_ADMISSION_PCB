import React, { useState, useMemo } from 'react';
import { MeritRecord, StreamType, RoundType } from '../types/admission';
import { exportCandidatesToExcel } from '../utils/excelParser';
import { 
  Search, 
  Download, 
  Filter, 
  Copy, 
  Check, 
  ExternalLink,
  GraduationCap,
  Calendar,
  Clock,
  Phone,
  Mail,
  UserCheck,
  Ticket
} from 'lucide-react';

interface SelectionRoundsViewProps {
  records: MeritRecord[];
  onSelectCandidate: (candidate: MeritRecord) => void;
  onOpenAdmin: () => void;
}

const cleanApplicantName = (name?: string) => {
  if (!name) return 'Student Candidate';
  if (name.includes('@')) {
    const username = name.split('@')[0];
    return username
      .replace(/[._+-]+/g, ' ')
      .trim()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
  return name;
};

import { buildTokenMap, getStandardDateKey, getRecordTimestamp, getTokenForCandidate } from '../utils/tokenManager';

export const SelectionRoundsView: React.FC<SelectionRoundsViewProps> = ({
  records,
  onSelectCandidate,
  onOpenAdmin,
}) => {
  const [selectedRound, setSelectedRound] = useState<RoundType>('selection_round_1');
  const [selectedStream, setSelectedStream] = useState<StreamType | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);

  // Fixed daily token numbers: immutable per student for each reporting day.
  // The assigned token numbers are permanently fixed for an applicant and NEVER change
  // when any applicant is removed from the list, undone, or marked absent.
  const tokenMap = useMemo(() => {
    return buildTokenMap(records, selectedRound);
  }, [records, selectedRound]);

  // Filter and sort selection records
  const filteredRecords = useMemo(() => {
    const list = records.filter((r) => {
      // Must be a selection round and status must be 'Reported'
      if (r.roundType !== selectedRound) return false;
      if (r.status !== 'Reported') return false;
      if (selectedStream !== 'All' && r.stream !== selectedStream) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesBarcode = r.barcodeNumber.toLowerCase().includes(q);
        const matchesName = (r.applicantName || r.name || '').toLowerCase().includes(q);
        const matchesMobile = (r.mobileNumber || r.mobile || '').toLowerCase().includes(q);
        const matchesEmail = (r.email || '').toLowerCase().includes(q);
        const matchesSubject = (r.majorSubject || r.subject || '').toLowerCase().includes(q);
        const tokenVal = getTokenForCandidate(r, tokenMap);
        const matchesToken = tokenVal > 0 ? (
          `token #${tokenVal}`.includes(q) || 
          `token ${tokenVal}`.includes(q) || 
          `#${tokenVal}` === q || 
          String(tokenVal) === q
        ) : false;
        return matchesBarcode || matchesName || matchesMobile || matchesEmail || matchesSubject || matchesToken;
      }
      return true;
    });

    // Sort chronologically by reporting day and arrival/token order
    return [...list].sort((a, b) => {
      const dayA = getStandardDateKey(a);
      const dayB = getStandardDateKey(b);
      if (dayA !== dayB) return dayA.localeCompare(dayB);

      const tokenA = getTokenForCandidate(a, tokenMap) || 999999;
      const tokenB = getTokenForCandidate(b, tokenMap) || 999999;
      if (tokenA !== tokenB) return tokenA - tokenB;

      const timeA = getRecordTimestamp(a);
      const timeB = getRecordTimestamp(b);
      if (timeA !== timeB) return timeA - timeB;

      return (a.barcodeNumber || a.id).localeCompare(b.barcodeNumber || b.id);
    });
  }, [records, selectedRound, selectedStream, searchQuery, tokenMap]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBarcode(text);
    setTimeout(() => setCopiedBarcode(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-cyan-950/40">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
            Merit List Archive
          </div>
          <h2 className="text-2xl font-bold text-white font-outfit mt-0.5">
            Selection Rounds (Phase-I & Phase-II)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Displaying reported candidates sorted by arrival order.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => exportCandidatesToExcel(filteredRecords, `Panchayat_College_${selectedRound}_Reported.xlsx`, tokenMap)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500/40 text-xs font-semibold text-slate-200 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Reported List (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-[#0b1016] border border-cyan-950/50 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Round Selector Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#070b0e] rounded-lg border border-slate-800">
            <button
              onClick={() => setSelectedRound('selection_round_1')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                selectedRound === 'selection_round_1'
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-[#070b0e] shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Selection Round 1 (Phase-I)
            </button>
            <button
              onClick={() => setSelectedRound('selection_round_2')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                selectedRound === 'selection_round_2'
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-[#070b0e] shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Selection Round 2 (Phase-II)
            </button>
          </div>

          {/* Stream Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Stream:</span>
            {(['All', 'Science', 'Arts', 'Commerce'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStream(s)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedStream === s
                    ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white bg-slate-900/60'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input Filter */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter Reported Candidates by Token, Barcode, Name, or Mobile..."
            className="w-full bg-[#070b0e] border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Candidates Data Table */}
      <div className="bg-[#0b1016] border border-cyan-950/40 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070b0e] text-slate-400 font-semibold border-b border-slate-800 text-[11px] whitespace-nowrap">
              <tr>
                <th className="py-3 px-3 font-mono">Sl No</th>
                <th className="py-3 px-3 font-mono">1. Barcode No</th>
                <th className="py-3 px-3">2. Applicant Name</th>
                <th className="py-3 px-3 font-mono text-center">Token No</th>
                <th className="py-3 px-3 font-mono">Reporting Date & Time</th>
                <th className="py-3 px-3 font-mono">4. Mark(%)</th>
                <th className="py-3 px-3 font-mono">5 & 6. Social / Selection</th>
                <th className="py-3 px-3 font-mono">7. Mobile Number</th>
                <th className="py-3 px-3">8. Board Name</th>
                <th className="py-3 px-3">9 & 10. Stream / Major Subject</th>
                <th className="py-3 px-3">Current Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <GraduationCap className="w-8 h-8 text-slate-600" />
                      <span>No reported candidates found matching the current criteria.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-cyan-950/20 transition-colors group">
                    {/* Serial Number */}
                    <td className="py-3 px-3 font-mono font-bold text-white tabular-nums">
                      #{idx + 1}
                    </td>

                    {/* 1. Barcode Number */}
                    <td className="py-3 px-3 font-mono whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                          {c.barcodeNumber}
                        </span>
                        <button
                          onClick={() => copyToClipboard(c.barcodeNumber)}
                          title="Copy Barcode"
                          className="text-slate-500 hover:text-cyan-400 p-1 rounded"
                        >
                          {copiedBarcode === c.barcodeNumber ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* 2. Applicant Name (Email ID omitted as requested) */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-semibold text-white group-hover:text-cyan-300 transition-colors">
                        {cleanApplicantName(c.applicantName || c.name)}
                      </div>
                    </td>

                    {/* Token Number: fixed sequential serial as per daily reporting time (immutable even if applicants are removed from list) */}
                    <td className="py-3 px-3 font-mono whitespace-nowrap text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-950/60 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.15)]">
                        <Ticket className="w-3.5 h-3.5 text-amber-400" />
                        <span>Token #{getTokenForCandidate(c, tokenMap)}</span>
                      </span>
                    </td>

                    {/* Reporting Date & Time */}
                    <td className="py-3 px-3 font-mono whitespace-nowrap text-slate-300 text-[11px]">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-cyan-400/80" />
                          <span>{c.reportingDate || '-'}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-teal-400/80" />
                          <span>{c.reportingTime || '-'}</span>
                        </div>
                      </div>
                    </td>

                    {/* 4. Mark(%) */}
                    <td className="py-3 px-3 font-mono whitespace-nowrap font-bold text-cyan-400">
                      {c.percentage.toFixed(2)}%
                    </td>

                    {/* 5 & 6. Social Category & Selection Category */}
                    <td className="py-3 px-3 font-mono whitespace-nowrap text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 mr-1" title="Social Category">
                        {c.socialCategory || c.category || 'GEN'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30" title="Selection Category">
                        {c.selectionCategory || 'UR'}
                      </span>
                    </td>

                    {/* 7. Mobile Number */}
                    <td className="py-3 px-3 font-mono whitespace-nowrap">
                      <a href={`tel:${c.mobileNumber || c.mobile}`} className="text-slate-300 hover:text-cyan-300 flex items-center gap-1 text-[11px]">
                        <Phone className="w-3 h-3 text-cyan-400/70" />
                        <span>{c.mobileNumber || c.mobile}</span>
                      </a>
                    </td>

                    {/* 8. Board Name */}
                    <td className="py-3 px-3 whitespace-nowrap text-slate-400 text-[11px]">
                      {c.boardName || 'CHSE, Odisha'}
                    </td>

                    {/* 9 & 10. Stream & Major Subject */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-semibold text-emerald-300">{c.majorSubject || c.subject}</div>
                      <div className="text-[11px] text-teal-400">{c.stream}</div>
                    </td>

                    {/* Current Status */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        c.status === 'Reported' 
                          ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                          : 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/30'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
