# Security Specification: UG e-Admission Portal (Panchayat College, Bargarh)

## 1. Data Invariants
- Admin operations require authorized admin status (exists in `/admins/{uid}` or authenticated as bootstrap administrator `malikmrutyunjay016@gmail.com`).
- Students can read published merit list records (or public can search their own barcode/name), but only admins can write, import, update, or delete merit list entries.
- Student application records (`/student_applications/{applicationId}`) can be created and read by the authenticated student owning the record (`resource.data.userId == request.auth.uid`), or modified by admins during document review and status updates.
- Admin directory (`/admins/{adminId}`) is strictly managed by admins and bootstrapped administrator.
- Default deny on all unmapped paths.

## 2. Dirty Dozen Attack Payloads
1. **Unauthenticated Merit Insertion**: Attacker sends POST to `/merit_records` without auth -> Rejected with PERMISSION_DENIED.
2. **Student Modifying Rank/Status**: Normal authenticated student attempts PUT to modify their own merit status or rank in `/merit_records` -> Rejected.
3. **Ghost Fields Injection**: Payload with extra unauthorized field `bypassVerification: true` -> Rejected via strict property validation.
4. **Student ID Spoofing in Application**: Attacker sets `userId: "victim_uid"` on a new application -> Rejected (must match `request.auth.uid`).
5. **Unauthorized Document Tampering**: Non-admin user tries to approve their own documents in application record -> Rejected.
6. **Admin Directory Self-Elevation**: Normal student writes their own UID to `/admins/{uid}` -> Rejected.
7. **PII Scraping via Blanket List**: Attacker queries `/student_applications` without matching their own userId -> Rejected.
8. **Malicious Giant Payloads**: 2MB strings in barcode or student name -> Rejected by size constraint `<= 128`.
9. **Fake Email Verified Spoof**: User with unverified fake email claims admin -> Rejected (requires `request.auth.token.email_verified == true`).
10. **Application Deletion by Stranger**: Another student attempts DELETE on someone else's admission dossier -> Rejected.
11. **Negative Percentage or Illegal Rank**: Payload with rank < 1 or percentage > 100 -> Rejected by boundary rules.
12. **Path Traversal / Junk Doc ID**: Path variable with illegal special characters -> Rejected by `isValidId()`.
