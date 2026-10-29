import React, { useMemo } from 'react';
import { MeritRecord } from '../types/admission';

interface AdmissionMetricsProps {
  records: MeritRecord[];
}

export const AdmissionMetrics: React.FC<AdmissionMetricsProps> = ({ records }) => {
  const stats = useMemo(() => {
    // Overall stats across all phases
    const total = records.length;
    
    // Count specifically those having 'Reported' status
    const reportedCount = records.filter(r => r.status === 'Reported').length;
    
    // Statuses that count as "Pending"
    const pending = records.filter(r => 
      r.status === 'Selected' || 
      r.status === 'Document Verification Pending' || 
      r.status === 'Spot Eligible' ||
      r.status === 'Waiting'
    ).length;
    
    // Global minimum cutoff percentage
    const minCutoff = records.length > 0 ? Math.min(...records.map(r => r.percentage)) : 0;

    return {
      total,
      reportedCount,
      pending,
      minCutoff: minCutoff ? minCutoff.toFixed(1) : 'N/A'
    };
  }, [records]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 animate-fadeIn">
      {/* 1. Allotted in Round (Total) */}
      <div className="bg-[#0b1016] border border-cyan-950/40 rounded-xl p-3.5 sm:p-4 shadow-lg hover:border-cyan-500/30 transition-colors group">
        <div className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-mono tracking-wider">Total Allotted (Phase I-III)</div>
        <div className="text-xl sm:text-2xl font-bold text-white font-outfit tabular-nums mt-0.5 group-hover:text-cyan-300 transition-colors">
          {stats.total} <span className="text-xs font-medium text-slate-500">Candidates</span>
        </div>
      </div>

      {/* 2. Reported */}
      <div className="bg-[#0b1016] border border-cyan-950/40 rounded-xl p-3.5 sm:p-4 shadow-lg hover:border-emerald-500/30 transition-colors group">
        <span className="block text-[10px] sm:text-[11px] text-emerald-400 uppercase font-mono tracking-wider">
          <span>reported</span>
        </span>
        <div className="text-xl sm:text-2xl font-bold text-emerald-300 font-outfit tabular-nums mt-0.5 group-hover:text-emerald-200 transition-colors">
          {stats.reportedCount}
        </div>
      </div>

      {/* 3. Verification Pending */}
      <div className="bg-[#0b1016] border border-cyan-950/40 rounded-xl p-3.5 sm:p-4 shadow-lg hover:border-amber-500/30 transition-colors group">
        <div className="text-[10px] sm:text-[11px] text-amber-400 uppercase font-mono tracking-wider">Verification Pending</div>
        <div className="text-xl sm:text-2xl font-bold text-amber-300 font-outfit tabular-nums mt-0.5 group-hover:text-amber-200 transition-colors">
          {stats.pending}
        </div>
      </div>

      {/* 4. Minimum Cutoff */}
      <div className="bg-[#0b1016] border border-cyan-950/40 rounded-xl p-3.5 sm:p-4 shadow-lg hover:border-cyan-500/30 transition-colors group">
        <div className="text-[10px] sm:text-[11px] text-cyan-400 uppercase font-mono tracking-wider">Global Min Cutoff %</div>
        <div className="text-xl sm:text-2xl font-bold text-cyan-300 font-outfit tabular-nums mt-0.5 group-hover:text-cyan-200 transition-colors">
          {stats.minCutoff}%
        </div>
      </div>
    </div>
  );
};
