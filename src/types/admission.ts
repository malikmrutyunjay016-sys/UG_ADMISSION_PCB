export type StreamType = 'Science' | 'Arts' | 'Commerce' | 'Self-Financing';

export type RoundType = 
  | 'selection_round_1' 
  | 'selection_round_2' 
  | 'spot_round_1' 
  | 'spot_round_2' 
  | 'waiting_list';

export type CandidateStatus = 
  | 'Selected' 
  | 'Reported'
  | 'Provisionally Admitted' 
  | 'Waiting' 
  | 'Spot Eligible' 
  | 'Document Verification Pending' 
  | 'Reported & Verified'
  | 'Admission Confirmed' 
  | 'Absent'
  | 'Rejected';

export interface MeritRecord {
  id: string;
  // 10 SAMS Admission Fields:
  barcodeNumber: string;       // 1. Barcode No
  applicantName?: string;      // 2. Applicant Name
  name: string;               // Candidate Name (compatibility)
  admissionDate?: string;      // 3. Admission Date
  percentage: number;          // 4. Mark(%)
  socialCategory?: string;     // 5. Social Category (GEN, SC, ST, OBC, SEBC)
  selectionCategory?: string;  // 6. Selection Category (UR, SC, ST, ESM, PWD)
  mobileNumber?: string;       // 7. Mobile Number
  mobile: string;             // Mobile (compatibility)
  boardName?: string;          // 8. Board Name (CHSE, CBSE, ICSE, etc.)
  stream: StreamType;          // 9. Stream (Science, Arts, Commerce, etc.)
  majorSubject?: string;       // 10. Major Subject (Physics, Pol Science, etc.)
  subject: string;            // Major / Honours Subject (compatibility)

  // System & Flow Fields:
  email: string;
  roundType: RoundType;
  category: string;           // Fallback / standard category
  rank: number;
  status: CandidateStatus;
  reportingDate?: string;
  reportingTime?: string;
  tokenNumber?: number;        // Fixed daily token number assigned upon reporting (preserved permanently)
  tokenDate?: string;          // Standardized date key (YYYY-MM-DD) for token sequence scope
  rollNumber?: string;         // College Class Roll Number (e.g. BS26-001, BA26-045, BC26-012)
  rollAllottedAt?: string;     // Timestamp when roll number was allotted
  rollAllottedBy?: string;     // Officer name who allotted roll number
  notes?: string;
  updatedAt?: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
  uploadedAt: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  notes?: string;
}

export interface StudentApplication {
  id: string;
  userId: string;
  barcodeNumber: string;
  name: string;
  mobile: string;
  email: string;
  stream: StreamType;
  subject: string;
  status: CandidateStatus;
  documents: {
    clc?: DocumentItem;
    marksheet12?: DocumentItem;
    certificate10?: DocumentItem;
    casteCert?: DocumentItem;
    photo?: DocumentItem;
    conductCert?: DocumentItem;
    cafCopy?: DocumentItem;
  };
  feeStatus: 'Pending' | 'Paid' | 'Exempted';
  transactionId?: string;
  reportingDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VacancySeat {
  stream: StreamType;
  subject: string;
  totalSeats: number;
  admittedSeats: number;
  vacantSeats: number;
  cutoffPercentage: number;
}
