# TV B11 Check-In Workflow & Anti-Proxy Security Specification

**Version:** 2.0 (Mobile Cyber-Futuristic Terminal)  
**Timezone:** `Asia/Colombo`  

---

## 1. Terminal Lifecycle States

```
+-------------------------------------------------------+
|                   STANDBY STATE                       |
|  - No broadcast pushed or all active windows expired  |
|  - Conic-gradient Radar Sweep HUD                     |
|  - "No attendance check-in available" banner          |
|  - Manual "Check Now" button & 15s gentle polling    |
+-------------------------------------------------------+
                           |
                           | Admin opens broadcast window
                           v
+-------------------------------------------------------+
|                    ACTIVE STATE                       |
|  - Module title, time slot, course badge displayed    |
|  - Step [01]: Select Programme (TPOPT / TPRPT)        |
|  - Step [02]: Enter Last 2 Digits (e.g. "02")         |
|  - Instant lookup -> Verified Student Match Card      |
|  - Single-tap "Confirm & Check In" CTA                |
+-------------------------------------------------------+
                           |
                           | Student clicks "Confirm & Check In"
                           v
+-------------------------------------------------------+
|                   VERIFIED STATE                      |
|  - Green HUD bracket confirmation card                |
|  - Full Name, Index Number, Module, Timestamp         |
|  - "Device Locked · Attendance Secured" badge         |
|  - Anti-proxy cookie & localStorage receipt written   |
+-------------------------------------------------------+
                           |
                           | Admin marks "Finalize Attendance"
                           v
+-------------------------------------------------------+
|                   FINALIZED STATE                     |
|  - Session window closed                             |
|  - Remaining unrecorded students set to "Absent"     |
|  - Official percentage computed for reports           |
+-------------------------------------------------------+
```

---

## 2. Verification & Disambiguation Rules

1. **Course Disambiguation:**
   - Both TPOPT and TPRPT have student indexes ending in `01` through `23`.
   - The terminal **requires** selecting the programme button before or alongside typing index digits.
   - Suffix `02` with `TPOPT` maps to `RT/TPOPT/26/02` (`P.A. Hesan Samudika`).
   - Suffix `02` with `TPRPT` maps to `RT/TPRPT/26/02` (`N.H.N. Pubudunee`).
   - Suffix lookup never executes blindly across both cohorts without a course discriminator.

2. **Common (ALL) Sessions:**
   - When a session has scope `ALL` (e.g. Common English or ICT lecture), students from both TPOPT and TPRPT are eligible.
   - The student chooses their specific enrolled course (`TPOPT` or `TPRPT`) and types their suffix.
   - The backend validates the student against the chosen course and confirms attendance for that common session.

3. **Leading Zero Preservation:**
   - All suffixes are normalized using string padding: `String(input).padStart(2, '0')`.
   - Entering `2` automatically resolves to `02`.
   - Database stores and matches `index_suffix` as `'02'`, avoiding accidental numeric truncation.

---

## 3. Concurrency & Duplicate Prevention

1. **Database Uniqueness Constraint:**
   - `UNIQUE (session_id, student_id)` on both `attendance_records` and `attendance_checkins`.
   - Even if concurrent requests arrive simultaneously, only one transaction succeeds; the second receives a database collision error which is translated into a clean `409 Conflict: Already Recorded` response.

2. **Backend Atomic Lookup & Lock:**
   - Before writing, backend checks existing confirmed check-ins and attendance records for the target session.
   - If present, returns:
     ```json
     {
       "success": false,
       "alreadyCheckedIn": true,
       "error": "Already Recorded: Student is already marked Present for this lecture session."
     }
     ```

3. **UI Debouncing & Disabled State:**
   - "Confirm & Check In" button is immediately disabled (`isSubmitting = true`) upon first tap, preventing rapid double-clicks.

---

## 4. Anti-Proxy Protection & Security Caveats

### Security Trade-Off Documented
- **Requirement:** Fast, low-friction check-in on mobile phones without requiring students to log in to full accounts for daily attendance.
- **Vulnerability:** If student A knows student B's 2-digit index suffix, they could potentially check in on their behalf from another location.

### Mitigations Implemented:
1. **Device Lock (Cookie & LocalStorage Receipt):**
   - Upon successful check-in, a signed HTTP cookie `tv_checkin_<sessionId>` and `localStorage` token are written to the browser.
   - If the same device attempts to check in another index for the same session, the server and client reject the attempt:
     `"Device Limit Reached: This device has already completed check-in for this session. One student per device per session is enforced."`
2. **Strict Time Window Expiry:**
   - Admin sets window duration (15, 30, 60, or 120 minutes).
   - Server validates timestamp: `now <= checkinExpiresAt`. Expired requests are unconditionally rejected.
3. **Admin Attendance Review & Roster Finalization:**
   - Admin inspects live submissions during class.
   - Admin can manually adjust or excuse students directly from the terminal editor.

---

## 5. Attendance Finalization Rules

1. **No Premature Absences:**
   - While a check-in broadcast is `active`, students who have not yet checked in remain `pending` (unmarked).
   - They are **not** marked `Absent` while the window is still open.
2. **Explicit Finalization:**
   - When the session window closes, the admin clicks **Finalize Attendance**.
   - Admin receives a confirmation dialog displaying the exact number of students being marked Absent.
   - Once confirmed, pending students for that session's course scope are converted to `Absent`.
3. **Calculation Formula:**
   $$\text{Attendance \%} = \frac{\text{Present}}{\text{Present} + \text{Absent}} \times 100$$
   - `Excused` and `Cancelled` sessions are strictly excluded from the denominator.
   - If denominator is 0, display `"No attendance data"`.
