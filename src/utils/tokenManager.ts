import { MeritRecord, RoundType } from '../types/admission';

export interface TokenEntry {
  tokenNumber: number;
  tokenDate: string; // YYYY-MM-DD
  barcodeNumber: string;
  candidateId: string;
  candidateName?: string;
  assignedAt: string;
}

const TOKEN_LEDGER_KEY = 'pcb_fixed_token_ledger_v2';
const DAILY_MAX_KEY = 'pcb_daily_max_tokens_v2';

// In-memory cache for ultra-fast lookup and consistency across re-renders
let inMemoryLedger: { [key: string]: TokenEntry } = {};
let inMemoryDailyMax: { [dateKey: string]: number } = {};
let isInitialized = false;

function loadFromStorage() {
  if (isInitialized) return;
  try {
    const rawLedger = localStorage.getItem(TOKEN_LEDGER_KEY);
    if (rawLedger) {
      inMemoryLedger = JSON.parse(rawLedger);
    }
  } catch (e) {
    console.warn('Failed to parse token ledger from storage:', e);
  }

  try {
    const rawMax = localStorage.getItem(DAILY_MAX_KEY);
    if (rawMax) {
      inMemoryDailyMax = JSON.parse(rawMax);
    }
  } catch (e) {
    console.warn('Failed to parse daily max tokens from storage:', e);
  }
  isInitialized = true;
}

function saveToStorage() {
  try {
    localStorage.setItem(TOKEN_LEDGER_KEY, JSON.stringify(inMemoryLedger));
    localStorage.setItem(DAILY_MAX_KEY, JSON.stringify(inMemoryDailyMax));
  } catch (e) {
    console.warn('Failed to persist token ledger to storage:', e);
  }
}

/**
 * Standardizes a date into YYYY-MM-DD string key for grouping daily tokens.
 */
export function getStandardDateKey(record: Partial<MeritRecord>): string {
  if (record.tokenDate && record.tokenDate.trim()) {
    return record.tokenDate.trim();
  }
  if (record.reportingDate && record.reportingDate.trim()) {
    const raw = record.reportingDate.trim();
    const ddmmyyyy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (ddmmyyyy) {
      return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
    }
    return raw;
  }
  if (record.admissionDate && record.admissionDate.trim()) {
    const raw = record.admissionDate.trim();
    const ddmmyyyy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (ddmmyyyy) {
      return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
    }
    return raw;
  }
  if (record.updatedAt) {
    try {
      const d = new Date(record.updatedAt);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch {
      // fallback
    }
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Extracts a numeric timestamp for candidate arrival/reporting.
 */
export function getRecordTimestamp(record: MeritRecord): number {
  if (record.updatedAt) {
    const t = new Date(record.updatedAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (record.reportingDate) {
    const dateKey = getStandardDateKey(record);
    const timeStr = record.reportingTime || '09:00:00 AM';
    const parsed = new Date(`${dateKey} ${timeStr}`).getTime();
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return (record.rank || 999999);
}

/**
 * Looks up existing assigned token entry for a candidate from record or persistent ledger.
 */
export function getAssignedTokenForCandidate(candidate: Partial<MeritRecord>): TokenEntry | null {
  loadFromStorage();
  const bcKey = (candidate.barcodeNumber || '').trim().toUpperCase();
  const idKey = candidate.id || '';

  // Direct property check
  if (typeof candidate.tokenNumber === 'number' && candidate.tokenNumber > 0) {
    const dateKey = candidate.tokenDate || getStandardDateKey(candidate);
    const entry: TokenEntry = {
      tokenNumber: candidate.tokenNumber,
      tokenDate: dateKey,
      barcodeNumber: bcKey,
      candidateId: idKey,
      candidateName: candidate.applicantName || candidate.name,
      assignedAt: candidate.updatedAt || new Date().toISOString(),
    };
    if (bcKey) inMemoryLedger[bcKey] = entry;
    if (idKey) inMemoryLedger[idKey] = entry;
    inMemoryDailyMax[dateKey] = Math.max(inMemoryDailyMax[dateKey] || 0, candidate.tokenNumber);
    saveToStorage();
    return entry;
  }

  // Check ledger by barcode
  if (bcKey && inMemoryLedger[bcKey]) {
    return inMemoryLedger[bcKey];
  }

  // Check ledger by ID
  if (idKey && inMemoryLedger[idKey]) {
    return inMemoryLedger[idKey];
  }

  return null;
}

/**
 * Permanently assigns or retrieves the fixed daily token number for a candidate.
 * 
 * Rules guaranteed:
 * 1. Once assigned, a candidate's token number NEVER changes under ANY circumstances.
 * 2. When any applicant is removed from the list, other applicants' token numbers NEVER shift or change.
 * 3. Daily token sequences start from 1 on each calendar day (YYYY-MM-DD).
 * 4. The maximum token counter for each day is strictly non-decreasing.
 * 5. If an applicant who was previously removed or undone reports again, their original token number is preserved.
 */
export function assignPermanentDailyToken(
  candidate: MeritRecord,
  allRecords?: MeritRecord[],
  targetDateKey?: string
): { tokenNumber: number; tokenDate: string } {
  loadFromStorage();

  // 1. Check if candidate already has an assigned token in ledger or record
  const existing = getAssignedTokenForCandidate(candidate);
  if (existing) {
    return {
      tokenNumber: existing.tokenNumber,
      tokenDate: existing.tokenDate,
    };
  }

  // 2. Determine target date key (YYYY-MM-DD)
  const dateKey = targetDateKey || candidate.tokenDate || getStandardDateKey(candidate);

  // 3. Find max token issued so far for that specific calendar day
  let maxToken = inMemoryDailyMax[dateKey] || 0;

  // Also check all entries in ledger for that date
  Object.values(inMemoryLedger).forEach((entry) => {
    if (entry.tokenDate === dateKey && entry.tokenNumber > maxToken) {
      maxToken = entry.tokenNumber;
    }
  });

  // Also check all existing records passed
  if (allRecords && allRecords.length > 0) {
    allRecords.forEach((r) => {
      const rKey = r.tokenDate || getStandardDateKey(r);
      if (rKey === dateKey && typeof r.tokenNumber === 'number' && r.tokenNumber > maxToken) {
        maxToken = r.tokenNumber;
      }
    });
  }

  const nextTokenNumber = maxToken + 1;
  inMemoryDailyMax[dateKey] = nextTokenNumber;

  const bcKey = (candidate.barcodeNumber || '').trim().toUpperCase();
  const idKey = candidate.id;

  const newEntry: TokenEntry = {
    tokenNumber: nextTokenNumber,
    tokenDate: dateKey,
    barcodeNumber: bcKey,
    candidateId: idKey,
    candidateName: candidate.applicantName || candidate.name,
    assignedAt: new Date().toISOString(),
  };

  if (bcKey) inMemoryLedger[bcKey] = newEntry;
  if (idKey) inMemoryLedger[idKey] = newEntry;

  saveToStorage();

  return {
    tokenNumber: nextTokenNumber,
    tokenDate: dateKey,
  };
}

/**
 * Backward-compatible alias for assignPermanentDailyToken.
 */
export function getNextDailyTokenNumber(
  candidate: MeritRecord,
  allRecords: MeritRecord[],
  targetDateKey?: string
): number {
  return assignPermanentDailyToken(candidate, allRecords, targetDateKey).tokenNumber;
}

/**
 * Safely resolves the fixed token number for a candidate.
 * NEVER falls back to dynamic row index (idx + 1).
 */
export function getTokenForCandidate(
  candidate: MeritRecord,
  tokenMap?: Map<string, number>
): number {
  // 1. Direct candidate tokenNumber property
  if (typeof candidate.tokenNumber === 'number' && candidate.tokenNumber > 0) {
    return candidate.tokenNumber;
  }

  // 2. Lookup in tokenMap if provided
  if (tokenMap) {
    const fromMapId = tokenMap.get(candidate.id);
    if (typeof fromMapId === 'number' && fromMapId > 0) return fromMapId;

    if (candidate.barcodeNumber) {
      const fromMapBc = tokenMap.get(candidate.barcodeNumber.trim().toUpperCase()) ?? tokenMap.get(candidate.barcodeNumber);
      if (typeof fromMapBc === 'number' && fromMapBc > 0) return fromMapBc;
    }
  }

  // 3. Lookup in persistent ledger
  const existing = getAssignedTokenForCandidate(candidate);
  if (existing && existing.tokenNumber > 0) {
    return existing.tokenNumber;
  }

  // 4. If candidate is Reported and needs a token assigned right now, assign permanently
  if (candidate.status === 'Reported' || candidate.status === 'Reported & Verified' || candidate.status === 'Admission Confirmed') {
    const assigned = assignPermanentDailyToken(candidate);
    return assigned.tokenNumber;
  }

  return 0;
}

/**
 * Synchronizes an array of records with the persistent token ledger.
 * Attaches tokenNumber and tokenDate to any record that has an entry in the ledger.
 */
export function syncRecordsWithLedger(records: MeritRecord[]): MeritRecord[] {
  loadFromStorage();
  let changed = false;

  const synced = records.map((record) => {
    // If record already has valid tokenNumber, ensure it's registered
    if (typeof record.tokenNumber === 'number' && record.tokenNumber > 0) {
      const bcKey = (record.barcodeNumber || '').trim().toUpperCase();
      const idKey = record.id;
      const dateKey = record.tokenDate || getStandardDateKey(record);
      
      if (!inMemoryLedger[bcKey] || !inMemoryLedger[idKey]) {
        const entry: TokenEntry = {
          tokenNumber: record.tokenNumber,
          tokenDate: dateKey,
          barcodeNumber: bcKey,
          candidateId: idKey,
          candidateName: record.applicantName || record.name,
          assignedAt: record.updatedAt || new Date().toISOString(),
        };
        if (bcKey) inMemoryLedger[bcKey] = entry;
        if (idKey) inMemoryLedger[idKey] = entry;
        inMemoryDailyMax[dateKey] = Math.max(inMemoryDailyMax[dateKey] || 0, record.tokenNumber);
        changed = true;
      }
      return record;
    }

    // Otherwise check if ledger has a preserved token for this candidate
    const existing = getAssignedTokenForCandidate(record);
    if (existing && existing.tokenNumber > 0) {
      return {
        ...record,
        tokenNumber: existing.tokenNumber,
        tokenDate: existing.tokenDate,
      };
    }

    return record;
  });

  if (changed) {
    saveToStorage();
  }

  return synced;
}

/**
 * Builds a fast lookup map of record id and barcodeNumber -> fixed token number.
 * Respects already assigned token numbers permanently.
 */
export function buildTokenMap(
  allRecords: MeritRecord[],
  filterRound?: RoundType
): Map<string, number> {
  loadFromStorage();
  syncRecordsWithLedger(allRecords);

  const map = new Map<string, number>();

  const relevantRecords = filterRound
    ? allRecords.filter((r) => r.roundType === filterRound)
    : allRecords;

  // Populate token map for all candidates using the persistent token resolution
  relevantRecords.forEach((cand) => {
    const token = getTokenForCandidate(cand);
    if (token > 0) {
      map.set(cand.id, token);
      if (cand.barcodeNumber) {
        map.set(cand.barcodeNumber.trim().toUpperCase(), token);
        map.set(cand.barcodeNumber, token);
      }
    }
  });

  return map;
}

/**
 * Strictly checks whether an applicant is currently marked as "Reported" in the OIC Reporting Console.
 * 
 * Rules:
 * 1. An applicant is ONLY considered marked reported if their active status is:
 *    - 'Reported' (actively marked reported by OIC desk, awaiting scrutiny)
 *    - 'Reported & Verified' (verified by verification desk)
 *    - 'Admission Confirmed' (final admission confirmed)
 *    - OR 'Rejected' ONLY IF they were previously reported by OIC (having an active reportingDate)
 * 2. An applicant is strictly NOT marked reported if:
 *    - status is 'Selected', 'Spot Eligible', 'Waiting', or 'Absent'
 *    - OR their reporting was undone by an OIC officer in the OIC console (which resets status to 'Selected' and clears reportingDate)
 *    - Note: even if a permanent token number was preserved in the candidate ledger per rules,
 *      if they are in 'Selected' / not reported, they must NEVER appear in the Verifying Officer Console.
 */
export function isMarkedReportedByOic(record: MeritRecord | null | undefined): boolean {
  if (!record) return false;

  const status = record.status;

  // Unreported / un-processed / absent candidates
  if (
    status === 'Selected' || 
    status === 'Spot Eligible' || 
    status === 'Waiting' || 
    status === 'Absent'
  ) {
    return false;
  }

  // Active reported statuses
  if (
    status === 'Reported' || 
    status === 'Reported & Verified' || 
    status === 'Admission Confirmed'
  ) {
    return true;
  }

  // Candidates flagged/rejected during document scrutiny, only if they physically reported through OIC
  if (status === 'Rejected') {
    return Boolean(record.reportingDate && record.reportingDate.trim() !== '');
  }

  return false;
}
