/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  User, 
  collection, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  doc, 
  getDocs,
} from './firebase';
import { MeritRecord, VacancySeat, DocumentItem } from './types/admission';
import { INITIAL_MERIT_RECORDS, VACANCY_DATA } from './data/seedData';
import { Navbar, NavTab } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { SelectionRoundsView } from './components/SelectionRoundsView';
import { SpotWaitingRoundsView } from './components/SpotWaitingRoundsView';
import { GuidelinesSection } from './components/GuidelinesSection';
import { AdminPortal } from './components/AdminPortal';
import { AdminLoginModal, AdminSession } from './components/AdminLoginModal';
import { AdminLoginCard } from './components/AdminLoginCard';
import { StatusTrackerModal } from './components/StatusTrackerModal';
import { OicReportingConsole } from './components/OicReportingConsole';
import { ExcelUploadSection } from './components/ExcelUploadSection';
import { AdmissionMetrics } from './components/AdmissionMetrics';
import { Footer } from './components/Footer';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // Navigation: All sections including OIC and Admin are top-level pages
  const [activeTab, setActiveTab] = useState<NavTab>('home');

  // Modals state (student tracker only)
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [trackerQuery, setTrackerQuery] = useState('');
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  // Admin session state from local ID/Password authentication
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => {
    try {
      const saved = localStorage.getItem('pcb_admin_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Merit records (synced with Firestore and localStorage fallback)
  const [meritRecords, setMeritRecords] = useState<MeritRecord[]>(() => {
    try {
      const saved = localStorage.getItem('pcb_merit_records');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_MERIT_RECORDS;
  });
  const [vacancies] = useState<VacancySeat[]>(VACANCY_DATA);

  // Auth observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Check if current user is admin
  // Authorized either via Admin ID/Password session OR Google Admin email
  const isAdmin = Boolean(
    adminSession !== null ||
    currentUser?.email === 'malikmrutyunjay016@gmail.com' ||
    (currentUser && currentUser.email?.endsWith('@panchayatcollege.ac.in'))
  );

  // Check if current user can access OIC Reporting Console:
  const canAccessOicReporting = Boolean(
    isAdmin ||
    adminSession?.role === 'Super Admin' ||
    adminSession?.role === 'OIC reporting' ||
    currentUser?.email === 'malikmrutyunjay016@gmail.com' ||
    (currentUser && currentUser.email?.toLowerCase().includes('reporting') && currentUser.email?.endsWith('@panchayatcollege.ac.in'))
  );

  const handleAdminLoginSuccess = (session: AdminSession) => {
    setAdminSession(session);
    setActiveTab('admin');
  };

  const handleAdminLogout = () => {
    setAdminSession(null);
    try {
      localStorage.removeItem('pcb_admin_session');
    } catch {
      // ignore
    }
  };

  // Helper to sanitize Firestore document IDs
  const getSafeDocId = (rec: { barcodeNumber?: string; id?: string }) => {
    const raw = (rec.barcodeNumber || rec.id || `rec_${Date.now()}`).trim();
    return raw.replace(/[^a-zA-Z0-9_-]/g, '_');
  };

  // Firestore sync for merit_records with automatic student deduplication
  useEffect(() => {
    const path = 'merit_records';
    try {
      const recordsCol = collection(db, path);
      const unsubscribe = onSnapshot(
        recordsCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const studentMap = new Map<string, MeritRecord>();
            snapshot.forEach((docSnap) => {
              const rec = docSnap.data() as MeritRecord;
              const barcodeKey = (rec.barcodeNumber || rec.id || docSnap.id).trim().toUpperCase();
              
              if (!barcodeKey) return;

              // Check if this is the canonical document (ID matches barcode)
              const safeId = getSafeDocId(rec);
              const isCanonical = docSnap.id === safeId;

              if (!studentMap.has(barcodeKey)) {
                studentMap.set(barcodeKey, { ...rec, id: docSnap.id });
              } else {
                const existing = studentMap.get(barcodeKey)!;
                const existingIsCanonical = existing.id === getSafeDocId(existing);
                
                const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
                const newTime = rec.updatedAt ? new Date(rec.updatedAt).getTime() : 0;

                // Priority logic:
                // 1. If this is canonical and the existing one isn't, prefer this.
                // 2. If both are same "canonicalness", prefer the one with later updatedAt.
                if ((isCanonical && !existingIsCanonical) || (newTime > existingTime)) {
                  studentMap.set(barcodeKey, { ...rec, id: docSnap.id });
                }
              }
            });

            const loaded = Array.from(studentMap.values()).sort((a, b) => (a.rank || 999) - (b.rank || 999));
            setMeritRecords(loaded);
            try {
              localStorage.setItem('pcb_merit_records', JSON.stringify(loaded));
            } catch {
              // ignore
            }
          } else {
            // If cloud database is empty, check localStorage first before falling back
            try {
              const saved = localStorage.getItem('pcb_merit_records');
              if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setMeritRecords(parsed);
                  // Upload cached records to Firestore so database is populated
                  parsed.forEach(async (rec: MeritRecord) => {
                    const safeId = getSafeDocId(rec);
                    try {
                      await setDoc(doc(db, 'merit_records', safeId), rec, { merge: true });
                    } catch (e) {
                      console.warn(e);
                    }
                  });
                  return;
                }
              }
            } catch {
              // ignore
            }
            setMeritRecords(INITIAL_MERIT_RECORDS);
          }
        },
        (error) => {
          console.warn('Realtime Firestore sync notice:', error.message);
          try {
            const saved = localStorage.getItem('pcb_merit_records');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setMeritRecords(parsed);
              }
            }
          } catch {
            // ignore
          }
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn('Failed to attach merit listener:', err);
    }
  }, []);

  // Admin: Add or import records from Excel with guaranteed deduplication
  const handleAddRecords = async (newRecords: MeritRecord[], replaceExisting = false) => {
    if (!newRecords || newRecords.length === 0) return;

    const studentMap = new Map<string, MeritRecord>();
    const nameToBarcodeMap = new Map<string, string>();

    // If replaceExisting is true for this round:
    const targetRounds = new Set(newRecords.map(r => r.roundType));
    const baseList = replaceExisting 
      ? meritRecords.filter(r => !targetRounds.has(r.roundType))
      : meritRecords;

    baseList.forEach((r) => {
      const bKey = (r.barcodeNumber || r.id).trim().toUpperCase();
      const nKey = (r.applicantName || r.name).trim().toUpperCase();
      studentMap.set(bKey, r);
      if (nKey) nameToBarcodeMap.set(nKey, bKey);
    });

    const docsToDelete: string[] = [];

    newRecords.forEach((r) => {
      const bKey = (r.barcodeNumber || r.id).trim().toUpperCase();

      studentMap.set(bKey, r);
    });

    const updated = Array.from(studentMap.values()).sort((a, b) => (a.rank || 999) - (b.rank || 999));
    setMeritRecords(updated);
    try {
      localStorage.setItem('pcb_merit_records', JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }

    // Persist to Firestore: delete obsolete documents and write clean ones
    try {
      const deletePromises = docsToDelete.map((docId) => deleteDoc(doc(db, 'merit_records', docId)));
      const writePromises = newRecords.map((rec) => {
        const safeDocId = getSafeDocId(rec);
        const docRef = doc(db, 'merit_records', safeDocId);
        return setDoc(docRef, rec, { merge: true });
      });
      await Promise.all([...deletePromises, ...writePromises]);
    } catch (error) {
      console.warn('Error writing records to Firestore:', error);
    }
  };

  // One-click cleaner to purge all duplicate student records from Firestore & local state
  const handleCleanDuplicates = async () => {
    try {
      const snap = await getDocs(collection(db, 'merit_records'));
      const docs = snap.docs.map((d: any) => ({ docId: d.id, ...(d.data() as MeritRecord) }));
      
      const bestRecords = new Map<string, typeof docs[0]>();
      const toDeleteIds: string[] = [];
      
      docs.forEach((docItem: any) => {
        const nameKey = (docItem.applicantName || docItem.name || '').trim().toUpperCase();
        const barcodeKey = (docItem.barcodeNumber || docItem.id || docItem.docId).trim().toUpperCase();
        const primaryKey = nameKey || barcodeKey;
        
        const score = (docItem.admissionDate ? 4 : 0) + 
                      (docItem.mobileNumber && docItem.mobileNumber !== '9800000000' ? 3 : 0) + 
                      (docItem.majorSubject && docItem.majorSubject !== 'General Elective' ? 2 : 0);
        
        if (!bestRecords.has(primaryKey)) {
          bestRecords.set(primaryKey, docItem);
        } else {
          const current = bestRecords.get(primaryKey)!;
          const currentScore = (current.admissionDate ? 4 : 0) + 
                               (current.mobileNumber && current.mobileNumber !== '9800000000' ? 3 : 0) + 
                               (current.majorSubject && current.majorSubject !== 'General Elective' ? 2 : 0);
          if (score > currentScore) {
            toDeleteIds.push(current.docId);
            bestRecords.set(primaryKey, docItem);
          } else {
            toDeleteIds.push(docItem.docId);
          }
        }
      });
      
      for (const id of toDeleteIds) {
        await deleteDoc(doc(db, 'merit_records', id));
      }
      
      const cleaned = Array.from(bestRecords.values()).sort((a, b) => (a.rank || 999) - (b.rank || 999));
      setMeritRecords(cleaned);
      localStorage.setItem('pcb_merit_records', JSON.stringify(cleaned));
      return { cleanedCount: toDeleteIds.length, totalRemaining: cleaned.length };
    } catch (err) {
      console.error('Error cleaning duplicates:', err);
      throw err;
    }
  };

  // Admin: Update single record status
  const handleUpdateRecord = async (updated: MeritRecord) => {
    const updatedWithTime = { ...updated, updatedAt: new Date().toISOString() };
    setMeritRecords((prev) => {
      const next = prev.map((r) => 
        (r.id === updatedWithTime.id || (r.barcodeNumber && r.barcodeNumber === updatedWithTime.barcodeNumber)) ? updatedWithTime : r
      );
      try {
        localStorage.setItem('pcb_merit_records', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    try {
      const safeDocId = getSafeDocId(updatedWithTime);
      const docRef = doc(db, 'merit_records', safeDocId);
      await setDoc(docRef, updatedWithTime, { merge: true });
    } catch (error) {
      console.warn('Firestore update warning:', error);
    }
  };

  // Admin: Delete record
  const handleDeleteRecord = async (id: string) => {
    const target = meritRecords.find((r) => r.id === id || r.barcodeNumber === id);
    setMeritRecords((prev) => {
      const next = prev.filter((r) => r.id !== id && r.barcodeNumber !== id);
      try {
        localStorage.setItem('pcb_merit_records', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    if (target) {
      try {
        const safeDocId = getSafeDocId(target);
        const docRef = doc(db, 'merit_records', safeDocId);
        await deleteDoc(docRef);
      } catch (error) {
        console.warn('Firestore delete warning:', error);
      }
    }
  };

  // Reset to initial college data
  const handleResetSeedData = async () => {
    setMeritRecords(INITIAL_MERIT_RECORDS);
    try {
      for (const rec of INITIAL_MERIT_RECORDS) {
        const docRef = doc(db, 'merit_records', rec.barcodeNumber);
        await setDoc(docRef, rec);
      }
    } catch (error) {
      console.warn('Seed reset note:', error);
    }
  };

  // Save student uploaded documents to Firestore
  const handleUpdateApplicationDoc = async (barcode: string, docKey: string, docItem: DocumentItem) => {
    if (!currentUser) return;
    try {
      const docRef = doc(db, 'student_applications', barcode);
      await setDoc(
        docRef,
        {
          userId: currentUser.uid,
          barcodeNumber: barcode,
          email: currentUser.email || '',
          name: currentUser.displayName || 'Applicant',
          status: 'Document Verification Pending',
          updatedAt: new Date().toISOString(),
          [`documents.${docKey}`]: docItem,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Could not persist student document application to Firestore:', err);
    }
  };

  const handleOpenTrackerWithQuery = (query: string) => {
    setTrackerQuery(query);
    setIsTrackerOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#070b0e] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Top Navbar adhering to 3-zone contract with all pages in menu */}
      <Navbar
        currentUser={currentUser}
        isAdmin={isAdmin}
        adminSession={adminSession}
        canAccessOicReporting={canAccessOicReporting}
        activeTab={activeTab}
        setActiveTab={(tab) => setActiveTab(tab)}
        onOpenTracker={() => { setTrackerQuery(''); setIsTrackerOpen(true); }}
        onOpenAdmin={() => setActiveTab('admin')}
        onOpenAdminLogin={() => setActiveTab('admin')}
        onOpenOicReporting={() => setActiveTab('oic')}
        onAdminLogout={handleAdminLogout}
      />

      <main className="flex-1">
        {/* Home Page: Contains Hero and the SAMS Excel Sheet Ingestion Component */}
        {activeTab === 'home' && (
          <div className="space-y-12">
            {/* Cinematic Hero Section Inspired by Reference Image */}
            <HeroSection
              onSearchBarcode={handleOpenTrackerWithQuery}
              onSelectTab={(tab) => setActiveTab(tab as NavTab)}
              onOpenTracker={() => { setTrackerQuery(''); setIsTrackerOpen(true); }}
              onOpenAdmin={() => setActiveTab('admin')}
            />

            {/* SAMS Merit Excel Sheet Ingestion Component - On Home Page */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-10">
              <ExcelUploadSection
                records={meritRecords}
                onAddRecords={handleAddRecords}
                isAdmin={isAdmin}
                adminSession={adminSession}
                onOpenLoginModal={() => setActiveTab('admin')}
                onOpenOicReporting={() => setActiveTab('oic')}
              />

              <AdmissionMetrics records={meritRecords} />
            </div>
          </div>
        )}

        {/* Selection Rounds View (Phase-I & Phase-II) - Free of Upload Components */}
        {activeTab === 'selection' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn space-y-6">
            <div className="flex items-center justify-between border-b border-cyan-950/40 pb-3">
              <button
                onClick={() => setActiveTab('home')}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition-colors cursor-pointer"
              >
                ← Back to Home
              </button>
            </div>
            <SelectionRoundsView
              records={meritRecords}
              onSelectCandidate={(c) => handleOpenTrackerWithQuery(c.barcodeNumber)}
              onOpenAdmin={() => setActiveTab('admin')}
            />
          </div>
        )}

        {/* Spot & Waiting Round View - Free of Upload Components */}
        {activeTab === 'spot' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn space-y-6">
            <div className="flex items-center justify-between border-b border-teal-950/40 pb-3">
              <button
                onClick={() => setActiveTab('home')}
                className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-mono transition-colors cursor-pointer"
              >
                ← Back to Home
              </button>
            </div>
            <SpotWaitingRoundsView
              records={meritRecords}
              vacancies={vacancies}
              onSelectCandidate={(c) => handleOpenTrackerWithQuery(c.barcodeNumber)}
              onOpenAdmin={() => setActiveTab('admin')}
            />
          </div>
        )}

        {/* OIC Physical Reporting & Document Verification Console (Page View) */}
        {activeTab === 'oic' && (
          <OicReportingConsole
            onClose={() => setActiveTab('home')}
            records={meritRecords}
            onUpdateRecord={handleUpdateRecord}
            onAddRecords={handleAddRecords}
            adminSession={adminSession}
            onOpenAdminPortal={() => setActiveTab('admin')}
          />
        )}

        {/* Admin Excel & Merit Management Portal (Page View) */}
        {activeTab === 'admin' && (
          <div className="animate-fadeIn">
            {!isAdmin ? (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <AdminLoginCard
                  onLoginSuccess={handleAdminLoginSuccess}
                  onBackHome={() => setActiveTab('home')}
                />
              </div>
            ) : (
              <AdminPortal
                onClose={() => setActiveTab('home')}
                currentUser={currentUser}
                isAdmin={isAdmin}
                adminSession={adminSession}
                onAdminLogout={handleAdminLogout}
                onOpenLoginModal={() => setActiveTab('admin')}
                onOpenOicReporting={() => setActiveTab('oic')}
                records={meritRecords}
                onAddRecords={handleAddRecords}
                onUpdateRecord={handleUpdateRecord}
                onDeleteRecord={handleDeleteRecord}
                onResetSeedData={handleResetSeedData}
                onCleanDuplicates={handleCleanDuplicates}
              />
            )}
          </div>
        )}

        {/* Admission Guidelines View */}
        {activeTab === 'guide' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn space-y-6">
            <div className="flex items-center justify-between border-b border-cyan-950/40 pb-3">
              <button
                onClick={() => setActiveTab('home')}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition-colors cursor-pointer"
              >
                ← Back to Home
              </button>
            </div>
            <GuidelinesSection onOpenTracker={() => { setTrackerQuery(''); setIsTrackerOpen(true); }} />
          </div>
        )}
      </main>

      {/* Admin ID / Password Login Modal (as quick popup fallback if needed) */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* Student Application Status Tracker & Document Upload Center */}
      <StatusTrackerModal
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
        records={meritRecords}
        currentUser={currentUser}
        initialQuery={trackerQuery}
        onUpdateApplicationDoc={handleUpdateApplicationDoc}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
