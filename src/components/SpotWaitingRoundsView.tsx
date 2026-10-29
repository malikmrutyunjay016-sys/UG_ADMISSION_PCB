import React, { useState, useMemo } from 'react';
import { MeritRecord, VacancySeat, RoundType } from '../types/admission';
import { exportCandidatesToExcel } from '../utils/excelParser';
import { 
  Search, 
  Download, 
  Sparkles, 
  Clock, 
  Calendar, 
  Copy, 
  Check, 
  ExternalLink,
  Layers,
  Phone,
  Mail,
  AlertCircle
} from 'lucide-react';

interface SpotWaitingRoundsViewProps {
  records: MeritRecord[];
  vacancies: VacancySeat[];
  onSelectCandidate: (candidate: MeritRecord) => void;
  onOpenAdmin: () => void;
}

export const SpotWaitingRoundsView: React.FC<SpotWaitingRoundsViewProps> = ({
  records,
  vacancies,
  onSelectCandidate,
  onOpenAdmin,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'spot' | 'waiting'>('spot');
  const [selectedStream, setSelectedStream] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);

  const targetRound: RoundType = activeSubTab === 'spot' ? 'spot_round_1' : 'waiting_list';

  // Filter spot and waiting records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (activeSubTab === 'spot') {
        if (!r.roundType.includes('spot')) return false;
      } else {
        if (!r.roundType.includes('waiting')) return false;
      }

      if (selectedStream !== 'All' && r.stream !== selectedStream) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
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
  }, [records, activeSubTab, selectedStream, searchQuery]);

  // Total vacant seats
  const totalVacancies = useMemo(() => {
    return vacancies.reduce((acc, curr) => acc + curr.vacantSeats, 0);
  }, [vacancies]);

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
          <div className="text-xs font-semibold uppercase tracking-widest text-teal-400">
            Phase-III Vacancy Allocations
          </div>
          <h2 className="text-2xl font-bold text-white font-outfit mt-0.5">
            Spot Admission & Waiting List Round
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time seat vacancy matrix and merit waitlist for left-over seats after Phase-I & II admissions at Panchayat College, Bargarh.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => exportCandidatesToExcel(filteredRecords, `Panchayat_College_${activeSubTab}_List.xlsx`)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-teal-500/40 text-xs font-semibold text-slate-200 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>Export {activeSubTab === 'spot' ? 'Spot' : 'Waiting'} List (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Vacant Seat Matrix Notice Banner */}
      <div className="bg-[#0b1219] border border-teal-900/50 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-outfit">
              Live Vacant Seats Available: <span className="text-teal-400 font-mono text-base font-extrabold">{totalVacancies} Seats</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Spot registration is open for eligible candidates on merit basis. Physical presence at college verification counter is required on scheduled dates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-teal-300 bg-teal-950/60 px-3 py-1.5 rounded-lg border border-teal-500/30 shrink-0">
          <Clock className="w-3.5 h-3.5" />
          <span>Spot Window: 12-Nov to 14-Nov 2026</span>
        </div>
      </div>

      {/* Live Subject Vacancy Grid */}
      <div className="bg-[#0b1016] border border-cyan-950/40 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-teal-400" />
            <span>Honours Subject Vacancy Breakdown</span>
          </div>
          <span className="text-[11px] text-slate-500">Updated in real time</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {vacancies.slice(0, 6).map((v) => (
            <div key={v.subject} className="bg-[#070b0e] border border-slate-800 rounded-lg p-2.5">
              <div className="text-[11px] font-semibold text-slate-200 truncate">{v.subject}</div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xs text-slate-500 font-mono">{v.stream}</span>
                <span className="text-sm font-extrabold font-mono text-teal-400 tabular-nums">
                  {v.vacantSeats} vacant
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-mono">
                Cutoff: {v.cutoffPercentage}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-tab Navigation and Search */}
      <div className="bg-[#0b1016] border border-cyan-950/50 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Sub-tab toggle */}
          <div className="flex items-center gap-1 p-1 bg-[#070b0e] rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveSubTab('spot')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeSubTab === 'spot'
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-[#070b0e] shadow-[0_0_12px_rgba(20,184,166,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Spot Selection List
            </button>
            <button
              onClick={() => setActiveSubTab('waiting')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeSubTab === 'waiting'
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-[#070b0e] shadow-[0_0_12px_rgba(20,184,166,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Waiting Queue (Position-wise)
            </button>
          </div>

          {/* Stream Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Stream:</span>
            {['All', 'Science', 'Arts', 'Commerce'].map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStream(s)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedStream === s
                    ? 'bg-teal-950/80 text-teal-300 border border-teal-500/40'
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
            placeholder="Search Spot/Waitlist by Barcode Number, Name, Mobile, Email, or Subject..."
            className="w-full bg-[#070b0e] border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/60"
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

      {/* Spot / Waiting Candidate Table */}
      <div className="bg-[#0b1016] border border-teal-950/40 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070b0e] text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-mono">
                  {activeSubTab === 'waiting' ? 'Wait Pos.' : 'Spot Rank'}
                </th>
                <th className="py-3 px-4 font-mono">Barcode Number</th>
                <th className="py-3 px-4">Candidate Details</th>
                <th className="py-3 px-4">Contact (Mobile & Email)</th>
                <th className="py-3 px-4">Stream & Honours</th>
                <th className="py-3 px-4 font-mono">Quota & %</th>
                <th className="py-3 px-4">Status & Reporting</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-600" />
                      <span>No candidates found in {activeSubTab === 'spot' ? 'Spot Admission' : 'Waiting List'} matching the filter.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((c) => (
                  <tr key={c.id} className="hover:bg-teal-950/20 transition-colors group">
                    {/* Rank / Wait Position */}
                    <td className="py-3.5 px-4 font-mono font-bold text-white tabular-nums">
                      {activeSubTab === 'waiting' ? `WL-#${c.rank}` : `Spot-#${c.rank}`}
                    </td>

                    {/* Barcode Number */}
                    <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/30">
                          {c.barcodeNumber}
                        </span>
                        <button
                          onClick={() => copyToClipboard(c.barcodeNumber)}
                          title="Copy Barcode"
                          className="text-slate-500 hover:text-teal-400 p-1 rounded"
                        >
                          {copiedBarcode === c.barcodeNumber ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Candidate Name */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-white group-hover:text-teal-300 transition-colors">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {c.notes || 'Spot verification scheduled'}
                      </div>
                    </td>

                    {/* Contact details */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5 text-[11px]">
                        <span className="flex items-center gap-1 text-slate-300 font-mono">
                          <Phone className="w-3 h-3 text-teal-400/70" />
                          {c.mobile}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400 truncate max-w-[180px]">
                          <Mail className="w-3 h-3 text-teal-400/70" />
                          {c.email}
                        </span>
                      </div>
                    </td>

                    {/* Stream & Honours */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-200">{c.subject}</div>
                      <div className="text-[11px] text-slate-500">{c.stream}</div>
                    </td>

                    {/* Quota & % */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold font-mono text-teal-400 tabular-nums">
                        {c.percentage.toFixed(2)}%
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Quota: {c.category}
                      </div>
                    </td>

                    {/* Status & Reporting */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold w-fit ${
                          c.status === 'Spot Eligible' 
                            ? 'bg-teal-950/70 text-teal-300 border border-teal-500/30'
                            : c.status === 'Waiting'
                            ? 'bg-indigo-950/70 text-indigo-300 border border-indigo-500/30'
                            : 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {c.status}
                        </span>
                        {c.reportingDate && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>{c.reportingDate}</span>
                            {c.reportingTime && (
                              <>
                                <Clock className="w-3 h-3 text-slate-500 ml-1" />
                                <span>{c.reportingTime}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => onSelectCandidate(c)}
                        className="px-3 py-1 text-xs font-semibold rounded bg-teal-950/60 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 hover:text-white transition-all flex items-center gap-1 ml-auto"
                      >
                        <span>View / Upload</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
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
