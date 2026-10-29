import React, { useState } from 'react';
import { Play, CheckCircle, FileText, Phone, Mail, MapPin, ExternalLink, HelpCircle } from 'lucide-react';

interface GuidelinesSectionProps {
  onOpenTracker: () => void;
}

export const GuidelinesSection: React.FC<GuidelinesSectionProps> = ({ onOpenTracker }) => {
  const [showVideoModal, setShowVideoModal] = useState(false);

  return (
    <div className="space-y-8">
      {/* Editorial Headline Inspired by "DISCOVER THE WORLD IN A NEW WAY" */}
      <div className="relative rounded-2xl bg-gradient-to-br from-[#071018] via-[#09131d] to-[#060a0e] border border-cyan-950/60 p-8 sm:p-12 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative max-w-3xl space-y-5">
          <div className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
            Higher Education Excellence
          </div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white font-outfit uppercase tracking-tight leading-tight">
            Step Into Your Future <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-300 to-cyan-500">
              At Panchayat College
            </span>
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Established in 1960, Panchayat Autonomous College, Bargarh is western Odisha's pioneering institution for undergraduate education. Follow the verified step-by-step pathway to confirm your degree allotment.
          </p>

          {/* Watch Guide CTA and Quick Actions */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => setShowVideoModal(true)}
              className="group flex items-center gap-3 px-5 py-3 rounded-xl bg-cyan-950/80 border border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-900/60 transition-all text-white font-semibold text-xs shadow-[0_0_20px_rgba(6,182,212,0.2)] cursor-pointer"
            >
              <span className="w-8 h-8 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </span>
              <span>Watch Admission Guide</span>
            </button>

            <button
              onClick={onOpenTracker}
              className="px-5 py-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/40 text-xs font-semibold text-slate-200 hover:text-white transition-colors"
            >
              Check My Barcode Status
            </button>
          </div>
        </div>
      </div>

      {/* 3 Pillars of SAMS Odisha Admission Rules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0b1016] border border-cyan-950/40 rounded-xl p-5 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs font-bold font-mono">
            01
          </div>
          <h3 className="text-base font-bold text-white font-outfit">Slide, Freeze, & Float</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            If you wish to retain your allotted subject at Panchayat College, select <strong>Freeze</strong>. If you hope for a higher preference in Phase-II, choose <strong>Slide</strong>.
          </p>
        </div>

        <div className="bg-[#0b1016] border border-cyan-950/40 rounded-xl p-5 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 text-xs font-bold font-mono">
            02
          </div>
          <h3 className="text-base font-bold text-white font-outfit">Original Certificates Required</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            You must bring original CLC, +2 Marksheet, 10th Certificate (DOB proof), 3 Passport Photos, and Caste/Reservation proofs for on-campus verification.
          </p>
        </div>

        <div className="bg-[#0b1016] border border-cyan-950/40 rounded-xl p-5 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 text-xs font-bold font-mono">
            03
          </div>
          <h3 className="text-base font-bold text-white font-outfit">Spot Round Prioritization</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Vacant seats after Phase-II are filled strictly in order of merit among physically reported applicants. No fresh CAF registration is needed for already registered candidates.
          </p>
        </div>
      </div>

      {/* College Contact & Grievance Desk */}
      <div className="bg-[#0b1016] border border-cyan-950/50 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="text-base font-bold text-white font-outfit">
              Admission Committee & Help Desk
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Have questions regarding subject change, fee payment, or document mismatch?
            </p>
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-mono">
                <Phone className="w-3.5 h-3.5 text-cyan-400" />
                <span>06646-232144 / +91 9437182930</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>eadmission@panchayatcollege.ac.in</span>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>Panchayat College, Canal Avenue, Bargarh - 768028, Odisha</span>
              </span>
            </div>
          </div>

          <a
            href="https://samsodisha.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-slate-900 border border-slate-700 hover:border-cyan-500/40 text-xs font-semibold text-cyan-300 rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
          >
            <span>Official SAMS Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Video Guide Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1016] border border-cyan-800/60 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-cyan-950/50 flex items-center justify-between bg-[#070b0e]">
              <h3 className="text-sm font-bold text-white font-outfit">
                UG e-Admission Walkthrough Guide 2026-27
              </h3>
              <button onClick={() => setShowVideoModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs text-slate-300">
              <div className="aspect-video bg-[#070b0e] rounded-xl border border-cyan-950/80 flex flex-col items-center justify-center p-6 text-center space-y-3 relative overflow-hidden">
                <div className="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.4)]">
                  <Play className="w-7 h-7 fill-current ml-1" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white font-outfit">SAMS Odisha UG Counseling Protocol</h4>
                  <p className="text-xs text-slate-400 max-w-md mt-1">
                    Guidance on Online Choice Locking, Reporting at Panchayat College Bargarh, and Spot Round Upgradations.
                  </p>
                </div>
              </div>

              <div className="space-y-2 bg-[#070b0e] p-4 rounded-xl border border-slate-800 text-xs">
                <div className="font-semibold text-white">Essential Steps for Reporting at Panchayat College:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Download SAMS Intimation Slip with Barcode number.</li>
                  <li>Carry 3 self-attested copies of 10th & +2 Marksheets.</li>
                  <li>Original College Leaving Certificate (CLC) from previous Higher Secondary school.</li>
                  <li>Deposit admission fee receipt generated via SAMS portal.</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-[#070b0e] border-t border-cyan-950/50 flex justify-end">
              <button
                onClick={() => setShowVideoModal(false)}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg text-xs"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
