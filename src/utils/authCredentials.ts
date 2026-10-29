export type OfficerRole = 'Super Admin' | 'OIC reporting' | 'OIC roll no' | 'Verifying Officer';

export interface OfficerCredential {
  id: string;
  loginId: string;
  password: string;
  officerName: string;
  desk: string;
  role: OfficerRole;
  active: boolean;
  updatedAt: string;
}

export const INITIAL_OFFICER_CREDENTIALS: OfficerCredential[] = [
  // Set 1: Verifying Officer (Desk 1 - Science & Commerce)
  {
    id: 'vo_desk_1',
    loginId: 'vo.desk1@panchayatcollege.ac.in',
    password: 'Verify@2026A',
    officerName: 'Prof. B. K. Patel',
    desk: 'Verification Desk-1 (Science & Commerce)',
    role: 'Verifying Officer',
    active: true,
    updatedAt: new Date().toISOString(),
  },
  // Set 2: Verifying Officer (Desk 2 - Arts & Social Sciences)
  {
    id: 'vo_desk_2',
    loginId: 'vo.desk2@panchayatcollege.ac.in',
    password: 'Verify@2026B',
    officerName: 'Dr. A. K. Mohanty',
    desk: 'Verification Desk-2 (Arts & Social Sciences)',
    role: 'Verifying Officer',
    active: true,
    updatedAt: new Date().toISOString(),
  },
  // Set 3: OIC Reporting (Desk 1 - Science & Commerce)
  {
    id: 'oic_rep_1',
    loginId: 'oic.reporting1@panchayatcollege.ac.in',
    password: 'Report@2026A',
    officerName: 'Dr. S. K. Dash',
    desk: 'OIC Reporting Desk-1 (Science & Commerce)',
    role: 'OIC reporting',
    active: true,
    updatedAt: new Date().toISOString(),
  },
  // Set 4: OIC Reporting (Desk 2 - Arts & Spot Admission)
  {
    id: 'oic_rep_2',
    loginId: 'oic.reporting2@panchayatcollege.ac.in',
    password: 'Report@2026B',
    officerName: 'Prof. M. K. Meher',
    desk: 'OIC Reporting Desk-2 (Arts & Spot Round)',
    role: 'OIC reporting',
    active: true,
    updatedAt: new Date().toISOString(),
  },
  // Set 5: OIC Roll No (Desk 1 - Science Allotment)
  {
    id: 'oic_roll_1',
    loginId: 'oic.rollno1@panchayatcollege.ac.in',
    password: 'RollNo@2026A',
    officerName: 'Dr. P. K. Sahu',
    desk: 'OIC Roll No Allotment Desk-1 (UG Science)',
    role: 'OIC roll no',
    active: true,
    updatedAt: new Date().toISOString(),
  },
  // Set 6: OIC Roll No (Desk 2 - Arts & Commerce Allotment)
  {
    id: 'oic_roll_2',
    loginId: 'oic.rollno2@panchayatcollege.ac.in',
    password: 'RollNo@2026B',
    officerName: 'Prof. R. N. Pradhan',
    desk: 'OIC Roll No Allotment Desk-2 (UG Arts & Commerce)',
    role: 'OIC roll no',
    active: true,
    updatedAt: new Date().toISOString(),
  },
];

export const SUPER_ADMIN_CREDENTIAL: OfficerCredential = {
  id: 'admin_super',
  loginId: 'admin@panchayatcollege.ac.in',
  password: 'Panchayat@2026',
  officerName: 'Chief Admission Officer',
  desk: 'Principal & Central Admission Committee',
  role: 'Super Admin',
  active: true,
  updatedAt: new Date().toISOString(),
};

const STORAGE_KEY = 'pcb_officer_credentials_v2';

export function getStoredOfficerCredentials(): OfficerCredential[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure new VO and OIC Roll No credentials exist even if old cache had only older roles
        const hasVO = parsed.some((c: OfficerCredential) => c.role === 'Verifying Officer');
        const hasRollNo = parsed.some((c: OfficerCredential) => c.role === 'OIC roll no');
        if (!hasVO || !hasRollNo) {
          const missing = INITIAL_OFFICER_CREDENTIALS.filter(c => !parsed.some((p: OfficerCredential) => p.id === c.id));
          const merged = [...parsed, ...missing];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          return merged;
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read stored credentials:', e);
  }
  return INITIAL_OFFICER_CREDENTIALS;
}

export function saveOfficerCredentials(credentials: OfficerCredential[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
  } catch (e) {
    console.warn('Could not save credentials to storage:', e);
  }
}

export function resetOfficerCredentialsToDefault(): OfficerCredential[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // ignore
  }
  return INITIAL_OFFICER_CREDENTIALS;
}

export function verifyOfficerLogin(loginId: string, passwordInput: string): OfficerCredential | null {
  const cleanId = loginId.trim().toLowerCase();
  const cleanPass = passwordInput.trim();

  // 1. Check Super Admin
  if (
    (cleanId === SUPER_ADMIN_CREDENTIAL.loginId.toLowerCase() ||
      cleanId === 'admin' ||
      cleanId === 'pcb_admin') &&
    cleanPass === SUPER_ADMIN_CREDENTIAL.password
  ) {
    return SUPER_ADMIN_CREDENTIAL;
  }

  // 2. Check Officer Accounts (OIC Roll No, OIC Reporting & Verifying Officers)
  const list = getStoredOfficerCredentials();
  for (const cred of list) {
    if (!cred.active) continue;
    const credId = cred.loginId.toLowerCase();
    const shortUsername = cred.loginId.split('@')[0].toLowerCase();
    
    // Quick aliases: e.g. "vo1" for vo.desk1, "roll1" for oic.rollno1, "rep1" for oic.reporting1
    const alias1 = cred.id === 'vo_desk_1' ? 'vo1' : cred.id === 'vo_desk_2' ? 'vo2' : cred.id === 'oic_roll_1' ? 'roll1' : cred.id === 'oic_roll_2' ? 'roll2' : cred.id === 'oic_rep_1' ? 'rep1' : cred.id === 'oic_rep_2' ? 'rep2' : '';
    const aliasDesk = cred.id === 'vo_desk_1' ? 'vo.desk1' : cred.id === 'vo_desk_2' ? 'vo.desk2' : cred.id === 'oic_roll_1' ? 'oic.rollno1' : cred.id === 'oic_roll_2' ? 'oic.rollno2' : '';

    if (
      (cleanId === credId || 
       cleanId === shortUsername || 
       (alias1 && cleanId === alias1) ||
       (aliasDesk && cleanId === aliasDesk)) && 
      cleanPass === cred.password
    ) {
      return cred;
    }
  }

  return null;
}

/**
 * Filter candidates transferred to OIC Roll Number Console.
 * An applicant's data is transferred to this section when they are verified in the Verification Officer Console.
 */
export function isVerifiedForRollAllotment(r: { status?: string; notes?: string; rollNumber?: string }): boolean {
  if (r.status === 'Rejected') return false;
  return (
    r.status === 'Reported & Verified' ||
    r.status === 'Admission Confirmed' ||
    Boolean(r.notes?.toLowerCase().includes('verified & approved')) ||
    Boolean(r.notes?.toLowerCase().includes('documents verified')) ||
    Boolean(r.rollNumber)
  );
}
