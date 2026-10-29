export type OfficerRole = 'Super Admin' | 'OIC reporting' | 'OIC roll no';

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
  // Set 1: OIC Reporting (Desk 1 - Science & Commerce)
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
  // Set 2: OIC Reporting (Desk 2 - Arts & Spot Admission)
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
  // Set 3: OIC Roll No (Desk 1 - Science Allotment)
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
  // Set 4: OIC Roll No (Desk 2 - Arts & Commerce Allotment)
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

  // 2. Check OIC Accounts
  const list = getStoredOfficerCredentials();
  for (const cred of list) {
    if (!cred.active) continue;
    const credId = cred.loginId.toLowerCase();
    const shortUsername = cred.loginId.split('@')[0].toLowerCase();
    
    // Accept full email or short username (e.g. "reporting1" or "oic.reporting1@panchayatcollege.ac.in")
    if ((cleanId === credId || cleanId === shortUsername) && cleanPass === cred.password) {
      return cred;
    }
  }

  return null;
}
