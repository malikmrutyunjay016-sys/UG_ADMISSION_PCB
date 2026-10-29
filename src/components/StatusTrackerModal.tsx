import React, { useState } from 'react';
import { MeritRecord, DocumentItem } from '../types/admission';
import { User } from '../firebase';
import { 
  X, 
  Search, 
  FileText, 
  UploadCloud, 
  CheckCircle, 
  Clock, 
  Printer, 
  Calendar, 
  Phone, 
  Mail, 
  ShieldCheck, 
  FileCheck,
  AlertCircle
} from 'lucide-react';

interface StatusTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: MeritRecord[];
  currentUser: User | null;
  initialQuery?: string;
  onUpdateApplicationDoc?: (barcode: string, docKey: string, docItem: DocumentItem) => Promise<void>;
}

export const StatusTrackerModal: React.FC<StatusTrackerModalProps> = ({
  isOpen,
  onClose,
  records,
  currentUser,
  initialQuery = '',
  onUpdateApplicationDoc,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCandidate, setSelectedCandidate] = useState<MeritRecord | null>(() => {
    if (initialQuery) {
      return records.find(r => r.barcodeNumber.toLowerCase() === initialQuery.toLowerCase()) || null;
    }
    return null;
  });

  // Local document upload state per document key
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, DocumentItem>>({
    clc: {
      id: 'doc_clc',
      name: 'Original_CLC_Panchayat.pdf',
      type: 'application/pdf',
      size: 142000,
      uploadedAt: '2026-10-27T10:14:00Z',
      status: 'Verified',
    },
    marksheet12: {
      id: 'doc_ms12',
      name: 'CHSE_Odisha_Marksheet_2026.pdf',
      type: 'application/pdf',
      size: 210000,
      uploadedAt: '2026-10-27T10:15:00Z',
      status: 'Verified',
    }
  });

  const [activeTab, setActiveTab] = useState<'status' | 'documents' | 'intimation'>('status');
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase().trim();
    const found = records.find(
      r => r.barcodeNumber.toLowerCase() === q ||
           r.name.toLowerCase().includes(q) ||
           r.mobile.includes(q) ||
           r.email.toLowerCase().includes(q)
    );
    setSelectedCandidate(found || null);
  };

  const handleFileUpload = (docKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newDoc: DocumentItem = {
      id: `doc_${docKey}_${Date.now()}`,
      name: file.name,
      type: file.type || 'application/pdf',
      size: file.size,
      uploadedAt: new Date().toISOString(),
      status: 'Pending',
    };

    setUploadedDocs(prev => ({
      ...prev,
      [docKey]: newDoc,
    }));

    if (selectedCandidate && onUpdateApplicationDoc) {
      onUpdateApplicationDoc(selectedCandidate.barcodeNumber, docKey, newDoc);
    }

    setUploadSuccessMessage(`Uploaded "${file.name}" successfully! Status: Under Committee Review.`);
    setTimeout(() => setUploadSuccessMessage(null), 3500);
  };

  const candidate = selectedCandidate || (records.length > 0 ? records[0] : null);

  // Status step calculation
  const getStepStatus = (stepIndex: number) => {
    if (!candidate) return 'upcoming';
    if (candidate.status === 'Admission Confirmed') return 'completed';
    if (candidate.status === 'Document Verification Pending') {
      return stepIndex <= 2 ? (stepIndex === 2 ? 'current' : 'completed') : 'upcoming';
    }
    if (candidate.status === 'Selected' || candidate.status === 'Spot Eligible') {
      return stepIndex <= 1 ? (stepIndex === 1 ? 'current' : 'completed') : 'upcoming';
    }
    return stepIndex === 0 ? 'completed' : 'upcoming';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-[#0b1016] border border-cyan-800/50 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-cyan-950/50 flex items-center justify-between bg-[#070b0e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-outfit">
                Student Admission Dossier & Document Verification
              </h2>
              <p className="text-xs text-slate-400">
                Panchayat College Bargarh · SAMS Odisha UG e-Admission 2026-27
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar at top */}
        <div className="p-4 bg-[#080d12] border-b border-cyan-950/40">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter SAMS Barcode Number (e.g. 26D109482), Student Name, or Mobile..."
                className="w-full bg-[#0d131a] border border-cyan-900/50 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-[#070b0e] font-semibold rounded-xl text-xs transition-all shadow-[0_0_12px_rgba(6,182,212,0.25)] shrink-0 cursor-pointer"
            >
              Lookup Dossier
            </button>
          </form>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {uploadSuccessMessage && (
            <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-300 animate-fadeIn">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{uploadSuccessMessage}</span>
            </div>
          )}

          {!candidate ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <AlertCircle className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-white">No candidate record found for "{searchQuery}"</p>
              <p className="text-xs text-slate-500">
                Please verify your SAMS CAF Barcode number printed on your Common Application Form.
              </p>
            </div>
          ) : (
            <>
              {/* Candidate Quick Info Card */}
              <div className="bg-[#070b0e] border border-cyan-900/40 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-white font-outfit">{candidate.name}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-semibold">
                        {candidate.barcodeNumber}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                      <span>Stream: <strong className="text-slate-200">{candidate.stream}</strong></span>
                      <span>·</span>
                      <span>Honours: <strong className="text-cyan-300">{candidate.subject}</strong></span>
                      <span>·</span>
                      <span>Quota: <strong className="text-slate-200">{candidate.category}</strong></span>
                      <span>·</span>
                      <span>+2 Score: <strong className="text-cyan-400 font-mono">{candidate.percentage}%</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-col items-start sm:items-end">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Admission Status</span>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold mt-1 ${
                      candidate.status === 'Admission Confirmed'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        : candidate.status === 'Selected'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                        : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                    }`}>
                      {candidate.status}
                    </span>
                  </div>
                </div>

                {/* Contact and Reporting Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-mono">{candidate.mobile}</span>
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="truncate">{candidate.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Report: {candidate.reportingDate || '2026-11-05'}</span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs within modal */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  onClick={() => setActiveTab('status')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'status'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Live Milestone Tracker
                </button>
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'documents'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Certificates</span>
                </button>
                <button
                  onClick={() => setActiveTab('intimation')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'intimation'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Intimation Letter</span>
                </button>
              </div>

              {/* Tab 1: Live Status Step Tracker */}
              {activeTab === 'status' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                    Application Lifecycle Milestones
                  </div>

                  <div className="relative border-l-2 border-cyan-950 ml-4 space-y-6 pl-6 py-2">
                    {[
                      {
                        title: '1. SAMS Merit Allotment',
                        desc: `Seat allotted in ${candidate.roundType.replace(/_/g, ' ')} for ${candidate.subject} Honours.`,
                        status: 'Completed',
                        date: 'Published by DHE Odisha'
                      },
                      {
                        title: '2. Mandatory Certificate Upload',
                        desc: 'Upload scanned copies of CLC, +2 Marksheet, and Conduct Certificate for verification.',
                        status: 'Verified / Active',
                        date: 'Action Required before reporting'
                      },
                      {
                        title: '3. Physical Verification at Campus',
                        desc: `Report at Panchayat College, Bargarh (${candidate.stream} Block Desk 3). Time: ${candidate.reportingTime || '10:00 AM'}.`,
                        status: candidate.status === 'Admission Confirmed' ? 'Verified' : 'Scheduled',
                        date: candidate.reportingDate || '2026-11-05'
                      },
                      {
                        title: '4. Admission Fee Clearance',
                        desc: 'Pay admission fees through SAMS student portal or college counter.',
                        status: candidate.status === 'Admission Confirmed' ? 'Paid' : 'Pending',
                        date: 'Within 48 hours of verification'
                      },
                      {
                        title: '5. College Roll Number Generation',
                        desc: 'Final admission confirmation and college identity issuance.',
                        status: candidate.status === 'Admission Confirmed' ? 'Admitted' : 'Awaiting Steps 3-4',
                        date: candidate.status === 'Admission Confirmed' ? 'Roll Allotted' : 'Pending'
                      }
                    ].map((step, idx) => (
                      <div key={idx} className="relative group">
                        <span className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 ${
                          idx <= 2 
                            ? 'bg-cyan-400 border-cyan-300 shadow-[0_0_10px_#22d3ee]' 
                            : 'bg-[#070b0e] border-slate-700'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white font-outfit">{step.title}</h4>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/20 font-mono">
                              {step.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{step.desc}</p>
                          <div className="text-[10px] text-slate-500 font-mono mt-1">{step.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Document Upload Center */}
              {activeTab === 'documents' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                        Upload Required Verification Documents
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Please upload original color scans (PDF/JPEG, max 5MB). Incomplete documents may result in seat cancellation.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'clc', title: 'College Leaving Certificate (CLC)', required: true },
                      { key: 'marksheet12', title: '+2 / 12th Marksheet & Certificate', required: true },
                      { key: 'certificate10', title: '10th Board Certificate (DOB Proof)', required: true },
                      { key: 'conductCert', title: 'Conduct / Character Certificate', required: true },
                      { key: 'casteCert', title: 'Caste Certificate (SC/ST/SEBC)', required: candidate.category !== 'GEN' },
                      { key: 'photo', title: 'Passport Size Photograph', required: true },
                    ].map((item) => {
                      const doc = uploadedDocs[item.key];
                      return (
                        <div key={item.key} className="bg-[#070b0e] border border-cyan-950/60 rounded-xl p-3.5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-white">
                                {item.title} {item.required && <span className="text-red-400">*</span>}
                              </span>
                              {doc ? (
                                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                                  doc.status === 'Verified' 
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                                }`}>
                                  {doc.status}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-mono">Not Uploaded</span>
                              )}
                            </div>

                            {doc && (
                              <div className="text-[11px] text-cyan-300 font-mono mt-1.5 flex items-center gap-1.5 truncate">
                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{doc.name}</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer flex items-center gap-1">
                              <UploadCloud className="w-3.5 h-3.5" />
                              <span>{doc ? 'Replace File' : 'Upload File'}</span>
                              <input
                                type="file"
                                accept=".pdf, .jpg, .jpeg, .png"
                                onChange={(e) => handleFileUpload(item.key, e)}
                                className="hidden"
                              />
                            </label>
                            <span className="text-[10px] text-slate-500 font-mono">PDF / JPG</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 3: Intimation Letter Preview */}
              {activeTab === 'intimation' && (
                <div className="bg-[#070b0e] border border-cyan-950/60 rounded-xl p-6 text-slate-200 space-y-4 animate-fadeIn">
                  <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-cyan-400 font-mono">Government of Odisha · Higher Education Dept.</div>
                      <h3 className="text-base font-bold text-white font-outfit mt-1">
                        Panchayat Autonomous College, Bargarh
                      </h3>
                      <p className="text-xs text-slate-400">Provisional Seat Allotment Intimation Slip (Session 2026-27)</p>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-xs text-cyan-300 font-bold bg-cyan-950/80 px-2.5 py-1 rounded border border-cyan-500/30">
                        {candidate.barcodeNumber}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">Generated: 28-Oct-2026</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-slate-500">Candidate Name:</span> <strong className="text-white ml-1">{candidate.name}</strong></div>
                    <div><span className="text-slate-500">Mobile Number:</span> <strong className="text-white ml-1 font-mono">{candidate.mobile}</strong></div>
                    <div><span className="text-slate-500">Stream Allotted:</span> <strong className="text-white ml-1">{candidate.stream}</strong></div>
                    <div><span className="text-slate-500">Honours Subject:</span> <strong className="text-cyan-300 ml-1">{candidate.subject}</strong></div>
                    <div><span className="text-slate-500">Category / Quota:</span> <strong className="text-white ml-1">{candidate.category}</strong></div>
                    <div><span className="text-slate-500">Merit Percentage:</span> <strong className="text-white ml-1 font-mono">{candidate.percentage}%</strong></div>
                    <div><span className="text-slate-500">Reporting Counter:</span> <strong className="text-white ml-1">Room 14, Main Campus</strong></div>
                    <div><span className="text-slate-500">Reporting Window:</span> <strong className="text-amber-300 ml-1">{candidate.reportingDate || '2026-11-05'}</strong></div>
                  </div>

                  <div className="p-3 bg-slate-900/60 rounded-lg text-[11px] text-slate-400 border border-slate-800">
                    <strong>Note:</strong> Please bring this intimation slip along with 3 passport size photos and original certificates for physical verification at Panchayat College Bargarh.
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Intimation Slip</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyan-950/50 bg-[#070b0e] flex items-center justify-between text-xs text-slate-400">
          <span>Official Helpline: 06646-232144 · eadmission@panchayatcollege.ac.in</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
