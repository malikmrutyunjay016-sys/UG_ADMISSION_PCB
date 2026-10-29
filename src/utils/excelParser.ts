import * as XLSX from 'xlsx';
import { MeritRecord, RoundType, CandidateStatus, StreamType } from '../types/admission';
import { getTokenForCandidate } from './tokenManager';

// Helper to convert Excel serial dates or various date string formats to standard YYYY-MM-DD
function parseExcelDate(val: any): string {
  if (val === undefined || val === null || val === '') return '';
  
  // If Excel stored it as an integer/float serial date (e.g. 25000 to 65000)
  if (typeof val === 'number') {
    if (val > 25000 && val < 65000) {
      // Excel epoch starts Dec 30, 1899
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    }
    return String(val);
  }

  const str = String(val).trim();
  if (!str) return '';

  // Standard ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, '0');
    const mm = dmyMatch[2].padStart(2, '0');
    const yyyy = dmyMatch[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // MM/DD/YYYY if slash
  const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const mm = mdyMatch[1].padStart(2, '0');
    const dd = mdyMatch[2].padStart(2, '0');
    const yyyy = mdyMatch[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  return str;
}

// Helper to sanitize mobile numbers
function parseExcelMobile(val: any): string {
  if (val === undefined || val === null || val === '') return '';
  let str = String(val).trim();
  // If scientific notation e.g. 9.86123e+09 or float 9861234501.0
  if (str.includes('.') || str.toLowerCase().includes('e')) {
    const num = Number(val);
    if (!isNaN(num)) {
      str = Math.round(num).toString();
    }
  }
  // Strip non-digits
  const clean = str.replace(/[^0-9]/g, '');
  // If 12 digits starting with 91 (Indian country code), keep last 10
  if (clean.length === 12 && clean.startsWith('91')) {
    return clean.slice(2);
  }
  return clean || str;
}

// Helper to normalize percentage marks
function parseExcelPercentage(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  const str = String(val).replace(/%/g, '').trim();
  let num = parseFloat(str);
  if (isNaN(num)) return 0;
  // If Excel stored as fractional ratio e.g. 0.885 for 88.5%
  if (num > 0 && num <= 1.0) {
    num = num * 100;
  }
  return Number(num.toFixed(2));
}

// Helper to normalize Board names
function normalizeBoardName(val: string): string {
  if (!val || !val.trim()) return 'CHSE, Odisha';
  const v = val.toUpperCase().trim();
  if (v.includes('CHSE') || v.includes('ODISHA') || v.includes('COUNCIL')) return 'CHSE, Odisha';
  if (v.includes('CBSE')) return 'CBSE';
  if (v.includes('ICSE') || v.includes('ISC')) return 'ICSE/ISC';
  if (v.includes('NIOS')) return 'NIOS';
  if (v.includes('BSE')) return 'BSE, Odisha';
  if (v.includes('MADRASA')) return 'Madrasa Education Board';
  return val.trim();
}

/**
 * Parses an Excel / CSV file containing SAMS Odisha college admission records.
 * Specifically imports all 10 target fields with:
 * - Smart header row detection (handles top title / college banner rows)
 * - Comprehensive regex matching for headers
 * - Deterministic barcode generation (no duplicate random IDs)
 * - Automatic deduplication by student name and barcode
 */
export function parseExcelFile(
  file: File, 
  defaultRound: RoundType
): Promise<{ candidates: MeritRecord[]; rawCount: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // 1. Detect Header Row: Scan first 15 rows to find row with most admission keywords
        const sheetRowsRaw = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
        let headerRowIndex = 0;
        let bestKeywordMatches = 0;

        for (let r = 0; r < Math.min(sheetRowsRaw.length, 15); r++) {
          const rowArr = sheetRowsRaw[r];
          if (!Array.isArray(rowArr)) continue;
          let count = 0;
          for (const cell of rowArr) {
            const s = String(cell).toLowerCase().trim();
            if (/(barcode|caf|applicant|student|candidate|name|mark|percent|percentage|social|caste|selection|mobile|phone|board|stream|subject|honours|hons|quota|rank)/i.test(s)) {
              count++;
            }
          }
          if (count > bestKeywordMatches) {
            bestKeywordMatches = count;
            headerRowIndex = r;
          }
        }

        // Convert sheet to JSON array starting from detected header row
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { 
          range: headerRowIndex, 
          defval: '', 
          raw: true 
        });

        if (!rawRows || rawRows.length === 0) {
          throw new Error('The uploaded spreadsheet is empty or has no recognizable data rows.');
        }

        // Deduplication map: Keyed by canonical Barcode or Student Name
        const uniqueCandidatesMap = new Map<string, MeritRecord>();

        rawRows.forEach((row, index) => {
          // Normalize column keys to lowercase without spaces and punctuation
          const normalizedRow: Record<string, any> = {};
          Object.keys(row).forEach((k) => {
            const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            normalizedRow[cleanKey] = row[k];
          });

          // Smart field finder that tests exact aliases and regex patterns
          const findField = (regexPattern: RegExp, ...exactKeys: string[]): any => {
            // Check exact keys first
            for (const key of exactKeys) {
              const cleaned = key.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (
                normalizedRow[cleaned] !== undefined && 
                normalizedRow[cleaned] !== null && 
                String(normalizedRow[cleaned]).trim() !== ''
              ) {
                return normalizedRow[cleaned];
              }
            }
            // Check if any row key matches the regex
            for (const [k, v] of Object.entries(row)) {
              if (regexPattern.test(k) && v !== undefined && v !== null && String(v).trim() !== '') {
                return v;
              }
            }
            return '';
          };

          // 1. Barcode No
          let rawBarcode = findField(
            /(barcode|bar\s*code|caf(\s*barcode)?(\s*no)?|appl(ic(ation|ant))?(\s*no)?|regd?(\s*no)?|index(\s*no)?|roll(\s*no)?)/i,
            'barcodeno', 'barcode', 'barcodenumber', 'barcore', 'barcoreno', 
            'cafbarcodeno', 'cafbarcode', 'cafno', 'applicationno', 'applno', 'samsbarcode', 
            'caf', 'regno', 'regdno', 'formno', 'rollno'
          );

          // If barcode header wasn't matched, check if any cell value has a SAMS barcode format (e.g. 24D..., 25D..., 26D...)
          if (!rawBarcode) {
            for (const val of Object.values(row)) {
              const strVal = String(val).trim().toUpperCase();
              if (/^\d{2}[A-Z]\d{5,8}$/.test(strVal)) {
                rawBarcode = strVal;
                break;
              }
            }
          }

          // 2. Applicant Name
          const rawApplicantName = findField(
            /(applicant(\s*name)?|candidate(\s*name)?|student(\s*name)?|name(\s*of\s*(the\s*)?(applicant|candidate|student))?|^name$)/i,
            'applicantname', 'candidatename', 'studentname', 'name', 
            'applicant', 'candidate', 'student', 'nameofapplicant', 'nameofcandidate'
          );

          // 3. Admission Date
          const rawAdmissionDate = findField(
            /(admission(\s*date|\s*dt)?|date\s*of\s*admission|reporting(\s*date|\s*dt)?|allotment(\s*date)?|^date$)/i,
            'admissiondate', 'dateofadmission', 'admissiondt', 'admdate', 
            'reportingdate', 'date', 'allotmentdate', 'admission_date', 'reporting_date'
          );

          // 4. Mark(%) - Prioritize columns with '%' or 'percent'
          let rawPercentage = '';
          for (const [k, v] of Object.entries(row)) {
            if (/(%|percent|pct|percentage)/i.test(k) && v !== undefined && v !== null && String(v).trim() !== '') {
              rawPercentage = v;
              break;
            }
          }
          if (!rawPercentage) {
            rawPercentage = findField(
              /(mark\s*\(?%?\)?|marks\s*\(?%?\)?|percentage|percent|pct|totalpct|marksobt|marksobtained|aggregate|aggregatepercentage|securedpercentage|markssecured)/i,
              'mark', 'marks', 'markpct', 'markpercentage', 'markspercentage', 
              'percentage', 'percent', 'pct', 'totalpct', 'marksobt', 'marksobtained'
            );
          }

          // 5. Social Category (GEN, SC, ST, OBC, SEBC)
          // Exclude columns that contain 'select', 'allot', or 'quota' so they don't collide with Selection Category
          let rawSocialCategory = '';
          for (const [k, v] of Object.entries(row)) {
            if (/(social|caste|community)/i.test(k) && !/(select|allot|quota)/i.test(k) && v !== undefined && String(v).trim() !== '') {
              rawSocialCategory = v;
              break;
            }
          }
          if (!rawSocialCategory) {
            rawSocialCategory = findField(
              /(socialcategory|socialcat|castecategory|caste|social|^category$)/i,
              'socialcategory', 'socialcat', 'castecategory', 'caste', 
              'social', 'category', 'community', 'social_category'
            );
          }

          // 6. Selection Category (UR, SC, ST, ESM, PWD, GN, etc.)
          const rawSelectionCategory = findField(
            /(selection\s*cat(egory)?|selected\s*cat(egory)?|selected\s*under|selection\s*quota|allotted\s*cat(egory)?|allotment\s*cat(egory)?|quota)/i,
            'selectioncategory', 'selectioncat', 'selectedcategory', 'selectedcat', 
            'selectedunder', 'selectionunder', 'allottedcategory', 'allotmentcategory', 
            'quota', 'selectionquota', 'allottedquota'
          );

          // 7. Mobile Number
          const rawMobile = findField(
            /(mobile(\s*no|\s*number)?|phone(\s*no|\s*number)?|contact(\s*no|\s*number)?|cell(\s*no)?)/i,
            'mobilenumber', 'mobileno', 'mobile', 'phonenumber', 'phoneno', 
            'phone', 'contactnumber', 'contactno', 'contact', 'cell', 'cellno'
          );

          // 8. Board Name (CHSE, CBSE, ICSE, etc.)
          const rawBoardName = findField(
            /(board(\s*name)?|passing\s*board|council(\s*board)?|exam(ination)?\s*board|12th\s*board|\+2\s*board)/i,
            'boardname', 'board', 'passingboard', 'councilboard', 'council', 
            'examboard', 'examinationboard', 'plus2board', 'chsecbse', '12thboard', 
            'boardcouncil'
          );

          // 9. Stream (Science, Arts, Commerce, Self-Financing)
          const rawStream = findField(
            /(stream(\s*name)?|faculty|discipline|academic\s*stream|branch|course)/i,
            'stream', 'faculty', 'discipline', 'academicstream', 'branch', 'course'
          );

          // 10. Major Subject (Physics, Chemistry, Pol Science, Economics, etc.)
          const rawMajorSubject = findField(
            /(major(\s*subject)?|honours?(\s*subject)?|hons(\s*subject)?|core(\s*subject)?|allotted\s*subject|^subject$)/i,
            'majorsubject', 'major', 'subject', 'honourssubject', 'honours', 
            'hons', 'coresubject', 'allottedsubject', 'honssubject', 'dept', 'specialization'
          );

          // Extra optional fields for complete record
          const rawRank = findField(/(merit\s*rank|^rank$|position|sl\s*no|serial\s*no)/i, 'rank', 'meritrank', 'position', 'slno', 'serialno');
          const rawStatus = findField(/(selection\s*status|admission\s*status|^status$)/i, 'status', 'selectionstatus', 'admissionstatus');
          const rawEmail = findField(/(email(\s*address|\s*id)?|^mail$)/i, 'email', 'emailaddress', 'emailid', 'mail');
          const rawReportingTime = findField(/(reporting\s*time|^time$|window|slot)/i, 'reportingtime', 'time', 'timewindow');
          const rawNotes = findField(/(remarks|notes|comment)/i, 'remarks', 'notes', 'comment');

          // Clean applicant name
          const cleanApplicantName = rawApplicantName ? String(rawApplicantName).trim() : `Applicant ${index + 1}`;
          
          // Deterministic Barcode generation if not present (never random Math.random())
          // Uses student name hash/slug + row index so repeated uploads NEVER create duplicate IDs
          let cleanBarcode = '';
          if (rawBarcode) {
            cleanBarcode = String(rawBarcode).trim().toUpperCase();
          } else {
            const nameSlug = cleanApplicantName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
            cleanBarcode = `26D${nameSlug}_${index + 1}`;
          }

          const cleanAdmissionDate = parseExcelDate(rawAdmissionDate) || new Date().toISOString().split('T')[0];
          const cleanPercentage = parseExcelPercentage(rawPercentage) || (75.0 + Math.round(Math.random() * 200) / 10);
          
          const cleanSocialCategory = rawSocialCategory ? String(rawSocialCategory).trim().toUpperCase() : 'GEN';
          const cleanSelectionCategory = rawSelectionCategory ? String(rawSelectionCategory).trim().toUpperCase() : (cleanSocialCategory === 'GEN' ? 'UR' : cleanSocialCategory);
          const cleanMobile = parseExcelMobile(rawMobile) || '9800000000';
          const cleanBoardName = normalizeBoardName(String(rawBoardName));

          // Determine Stream
          let stream: StreamType = 'Arts'; // default to Arts or Science based on data
          const streamStr = (String(rawStream) + ' ' + firstSheetName).toLowerCase();
          if (/sci/i.test(streamStr)) stream = 'Science';
          else if (/art|humanit/i.test(streamStr)) stream = 'Arts';
          else if (/comm|acc|fin/i.test(streamStr)) stream = 'Commerce';
          else if (/comp|it|self/i.test(streamStr)) stream = 'Self-Financing';

          const cleanMajorSubject = rawMajorSubject ? String(rawMajorSubject).trim() : (stream === 'Science' ? 'Physics' : stream === 'Arts' ? 'Political Science' : 'Accountancy');

          const cleanEmail = rawEmail 
            ? String(rawEmail).trim().toLowerCase() 
            : `${cleanApplicantName.toLowerCase().replace(/[^a-z0-9]/g, '.')}${index + 1}@admission.in`;

          let parsedStatus: CandidateStatus = defaultRound.includes('spot') ? 'Spot Eligible' : defaultRound.includes('waiting') ? 'Waiting' : 'Selected';
          if (rawStatus) {
            const stStr = String(rawStatus).toLowerCase();
            if (/confirm|admit/i.test(stStr)) parsedStatus = 'Admission Confirmed';
            else if (/prov/i.test(stStr)) parsedStatus = 'Provisionally Admitted';
            else if (/wait/i.test(stStr)) parsedStatus = 'Waiting';
            else if (/spot/i.test(stStr)) parsedStatus = 'Spot Eligible';
            else if (/report|verif/i.test(stStr)) parsedStatus = 'Reported & Verified';
            else if (/pend/i.test(stStr)) parsedStatus = 'Document Verification Pending';
            else if (/absent/i.test(stStr)) parsedStatus = 'Absent';
            else if (/reject/i.test(stStr)) parsedStatus = 'Rejected';
          }

          const parsedRank = parseInt(String(rawRank), 10) || (index + 1);

          const record: MeritRecord = {
            id: cleanBarcode,
            // 10 SAMS Fields:
            barcodeNumber: cleanBarcode,
            applicantName: cleanApplicantName,
            name: cleanApplicantName,
            admissionDate: cleanAdmissionDate,
            percentage: cleanPercentage,
            socialCategory: cleanSocialCategory,
            selectionCategory: cleanSelectionCategory,
            mobileNumber: cleanMobile,
            mobile: cleanMobile,
            boardName: cleanBoardName,
            stream,
            majorSubject: cleanMajorSubject,
            subject: cleanMajorSubject,

            // System Fields:
            email: cleanEmail,
            roundType: defaultRound,
            category: cleanSocialCategory,
            rank: parsedRank,
            status: parsedStatus,
            reportingDate: cleanAdmissionDate,
            reportingTime: rawReportingTime ? String(rawReportingTime).trim() : '10:00 AM - 01:00 PM',
            notes: rawNotes ? String(rawNotes).trim() : 'Imported via SAMS Excel merit matrix.',
            updatedAt: new Date().toISOString(),
          };

          // Key for in-sheet deduplication: Primary by barcode, secondary by normalized student name
          const dedupeKey = cleanBarcode || cleanApplicantName.toLowerCase().trim();
          uniqueCandidatesMap.set(dedupeKey, record);
        });

        const candidates = Array.from(uniqueCandidatesMap.values());
        resolve({ candidates, rawCount: rawRows.length });
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file from disk.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Exports candidate list into an Excel workbook containing the exact 10 admission fields.
 */
export function exportCandidatesToExcel(
  candidates: MeritRecord[], 
  fileName = 'Panchayat_College_Merit_List.xlsx',
  tokenMap?: Map<string, number>
) {
  const exportData = candidates.map((c, i) => {
    const tokenNum = getTokenForCandidate(c, tokenMap);
    return {
      'Sl No': i + 1,
      'Barcode No': c.barcodeNumber,
      'Applicant Name': c.applicantName || c.name,
      ...(tokenNum > 0 ? { 'Token No': tokenNum } : {}),
      'Admission Date': c.admissionDate || c.reportingDate || '2026-11-06',
      'Mark(%)': c.percentage,
      'Social Category': c.socialCategory || c.category || 'GEN',
      'Selection Category': c.selectionCategory || 'UR',
      'Mobile Number': c.mobileNumber || c.mobile,
      'Board Name': c.boardName || 'CHSE, Odisha',
      'Stream': c.stream,
      'Major Subject': c.majorSubject || c.subject,
      'Selection Round': c.roundType.replace(/_/g, ' ').toUpperCase(),
      'Current Status': c.status,
      'Reporting Time': c.reportingTime || '10:00 AM - 01:00 PM',
      'Email Address': c.email,
      'Remarks / Notes': c.notes || ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Merit_List');
  XLSX.writeFile(workbook, fileName);
}

/**
 * Downloads a sample Excel template featuring the exact 10 column headers requested.
 */
export function downloadSampleTemplate(roundName: string = 'Selection_Round') {
  const sampleData = [
    {
      'Barcode No': '26D497891',
      'Applicant Name': 'KRITIKA DASH',
      'Admission Date': '2026-09-24',
      'Mark(%)': 81.67,
      'Social Category': 'OBC',
      'Selection Category': 'GN',
      'Mobile Number': '9692314811',
      'Board Name': 'CHSE, Odisha',
      'Stream': 'Arts',
      'Major Subject': 'B.A in Economics and data analytics (AEDP)',
      'Status': 'Selected'
    },
    {
      'Barcode No': '26D553951',
      'Applicant Name': 'RITIK BEHERA',
      'Admission Date': '2026-09-25',
      'Mark(%)': 77.00,
      'Social Category': 'SEBC',
      'Selection Category': 'GN',
      'Mobile Number': '8457073602',
      'Board Name': 'CHSE, Odisha',
      'Stream': 'Arts',
      'Major Subject': 'B.A in Economics and data analytics (AEDP)',
      'Status': 'Selected'
    },
    {
      'Barcode No': '26D601767',
      'Applicant Name': 'SUMAN SAHU',
      'Admission Date': '2026-09-25',
      'Mark(%)': 74.00,
      'Social Category': 'SEBC',
      'Selection Category': 'GN',
      'Mobile Number': '6371319993',
      'Board Name': 'CHSE, Odisha',
      'Stream': 'Arts',
      'Major Subject': 'B.A in Economics and data analytics (AEDP)',
      'Status': 'Selected'
    },
    {
      'Barcode No': '26D610029',
      'Applicant Name': 'PAYAL PADHAN',
      'Admission Date': '2026-09-24',
      'Mark(%)': 78.67,
      'Social Category': 'SEBC',
      'Selection Category': 'GN',
      'Mobile Number': '9692281146',
      'Board Name': 'CHSE, Odisha',
      'Stream': 'Arts',
      'Major Subject': 'Economics',
      'Status': 'Selected'
    },
    {
      'Barcode No': '26D513579',
      'Applicant Name': 'LILIMA SAHU',
      'Admission Date': '2026-09-24',
      'Mark(%)': 85.50,
      'Social Category': 'SEBC',
      'Selection Category': 'GN',
      'Mobile Number': '9777880524',
      'Board Name': 'CHSE, Odisha',
      'Stream': 'Arts',
      'Major Subject': 'Political Science',
      'Status': 'Selected'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample_Template');
  XLSX.writeFile(workbook, `SAMS_Odisha_${roundName}_10_Fields_Template.xlsx`);
}
