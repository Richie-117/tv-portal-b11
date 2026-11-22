# TV B11 New Mobile-First Portal — Project Discovery & Architecture Document

**Date:** 2026-11-22  
**System:** Division of Television Studies — University College of Ratmalana (UCR), Batch 11  
**Target Platform:** Mobile-First Web Application (PWA-Ready)  
**Hosting Target:** Render  
**Database Target:** Supabase (PostgreSQL with Row Level Security) with Resilient Local Fallback Engine  
**Old Source Reference (Read-Only):** `D:\UCR-Portal-New`  
**Workspace:** `D:\TV-B11`  

---

## 1. Verified Source Files & Inventory (`D:\UCR-Portal-New`)

Inspection of `D:\UCR-Portal-New` (Commit `9089709`: *"feat: add standalone /check-in terminal, multi-cohort (Both) roll-call support, and anti-proxy validation"*) revealed:

| File / Component | Verified Purpose & Contents | Reusable Logic / Findings |
|---|---|---|
| `data/db.json` | Core data store containing 48 enrolled students, 6 course modules, foundation timetables, 21 attendance sessions, admin credentials. | Student names, index numbers, courses (`TPOPT`, `TPRPT`), foundation timetable slots, module codes. |
| `src/app/check-in/page.tsx` | High-fidelity Cyber-Futuristic Student Attendance Terminal. Implements Radar Standby mode, Active Roll-Call mode, Programme Selector (`TPOPT` / `TPRPT`), last-2-digits index input, Verified Student Match card, and single-device locking. | Exact UI visual blueprint, corner HUD brackets, cyber-radar sweep animation, color palette, and micro-interactions. |
| `src/app/admin/attendance/page.tsx` | Admin check-in broadcast controls and attendance session editor. | Modal for opening check-in broadcast (15, 30, 60, 120 min), manual roll-call editor (Present/Absent/Excused), search filter, export triggers. |
| `src/lib/attendanceCalculations.ts` | Authoritative calculation rules for attendance percentage and session validity. | Standard formula: $\text{Attendance \%} = \frac{\text{Present}}{\text{Present} + \text{Absent}} \times 100$. Excused and cancelled sessions excluded from denominator; 0 denominator renders "No attendance data". Tracking officially starts `2026-10-25` / `2026-11-16`. |
| `src/lib/timetableService.ts` | Timezone evaluation (`Asia/Colombo`), weekday calculation, live lecture resolution, and override handling. | Pure time math, slot boundary calculations, and override status resolution (`LECTURE_ONGOING`, `UPCOMING_LECTURE`, `BREAK`, `POSTPONED`, `CANCELLED`). |
| `src/lib/pdfGenerator.ts` & `src/lib/excelExport.ts` | PDF and Excel report generation using `jspdf`, `jspdf-autotable`, and `exceljs`. | Clean layout headers, cohort breakdowns, present/absent color coding, and verified institutional metadata. |
| `supabase/complete_unified_schema_and_seed.sql` | Legacy PostgreSQL migration. | Legacy table relationships, roles, and schema constraints. |

---

## 2. Verified Student Data & Cohort Inventory

Only **two academic programmes** are in scope:
- **TPOPT:** Television & Digital Media Post-Production Technology (26 students)
- **TPRPT:** Television & Digital Media Production Technology (22 students)
- **Total Batch 11 Students:** 48 students

### Minimal Data Privacy Extraction Rule
In accordance with Section 1.2 of the build specifications, **only the minimal operational fields are extracted**:
1. `id` — System unique identifier
2. `indexNumber` / `studentNumber` — Full official index number (e.g., `RT/TPOPT/26/02`)
3. `indexSuffix` — Normalized two-digit numeric suffix (e.g., `02`, `14`)
4. `fullName` — Student display name
5. `course` — `TPOPT` or `TPRPT`
6. `isActive` — Enrollment status flag (boolean)

> **Privacy Guard:** Phone numbers, home addresses, national identity card numbers (NIC), parent/guardian contacts, and emergency contacts are **strictly omitted** from the new portal database and public payloads.

### Verified Cohort Roster

#### TPOPT Cohort (26 Students)
| # | Index Number | Suffix | Verified Display Name | Course |
|---|---|---|---|---|
| 1 | `RT/TPOPT/26/01` | `01` | D.G. Dissanayaka | TPOPT |
| 2 | `RT/TPOPT/26/02` | `02` | P.A. Hesan Samudika | TPOPT |
| 3 | `RT/TPOPT/26/03` | `03` | J.L.S. Rithsara | TPOPT |
| 4 | `RT/TPOPT/26/04` | `04` | H.D.U.T. Kumara | TPOPT |
| 5 | `RT/TPOPT/26/05` | `05` | H.K.S.S. Habaraduwa | TPOPT |
| 6 | `RT/TPOPT/26/06` | `06` | A.L.A. Eshan Nimsara | TPOPT |
| 7 | `RT/TPOPT/26/07` | `07` | Chamitha | TPOPT |
| 8 | `RT/TPOPT/26/08` | `08` | K. Prabhash Manuja Janadhi | TPOPT |
| 9 | `RT/TPOPT/26/09` | `09` | H.M. Siluni Raveesha | TPOPT |
| 10 | `RT/TPOPT/26/10` | `10` | P.A. Shalindi Geethma Perera | TPOPT |
| 11 | `RT/TPOPT/26/11` | `11` | M.D. Chiranjeewani Ransimala | TPOPT |
| 12 | `RT/TPOPT/26/12` | `12` | C.A. Nisansala | TPOPT |
| 13 | `RT/TPOPT/26/13` | `13` | B.B. Kaveesha Chamod Jayasekara | TPOPT |
| 14 | `RT/TPOPT/26/14` | `14` | A.D. Ruchira Sahan Samarasingha | TPOPT |
| 15 | `RT/TPOPT/26/15` | `15` | W.A. Achintha Dineth Weerasooriya | TPOPT |
| 16 | `RT/TPOPT/26/16` | `16` | W.G.K. Kalindu Praveen Charuka | TPOPT |
| 17 | `RT/TPOPT/26/17` | `17` | K.G. Pasindu Dilshan | TPOPT |
| 18 | `RT/TPOPT/26/18` | `18` | R.L. Kasun Sandeepa | TPOPT |
| 19 | `RT/TPOPT/26/19` | `19` | W. Kalana Latharu | TPOPT |
| 20 | `RT/TPOPT/26/20` | `20` | T.R. Wickramarathna | TPOPT |
| 21 | `RT/TPOPT/26/21` | `21` | I.W. Sandas Nethra Lankawera | TPOPT |
| 22 | `RT/TPOPT/26/22` | `22` | P. Tharushika Nethmi | TPOPT |
| 23 | `RT/TPOPT/26/23` | `23` | R.P. Keshani Vimansa Rajapaksha | TPOPT |
| 24 | `RT/TPOPT/26/24` | `24` | H.K. Praveen Moshaka | TPOPT |
| 25 | `RT/TPOPT/26/25` | `25` | T.H. Maleesha | TPOPT |
| 26 | `RT/TPOPT/26/26` | `26` | H.P. Sakuni Harshani Samaraweera | TPOPT |

#### TPRPT Cohort (22 Students)
*Note: Suffix `08` is not assigned in the official batch registry; indexes range `01`–`07` and `09`–`23`.*
| # | Index Number | Suffix | Verified Display Name | Course |
|---|---|---|---|---|
| 1 | `RT/TPRPT/26/01` | `01` | R.R.M.K.G.T. Vimal Aweera | TPRPT |
| 2 | `RT/TPRPT/26/02` | `02` | N.H.N. Pubudunee | TPRPT |
| 3 | `RT/TPRPT/26/03` | `03` | W.A.D.T.K. Thilakarathna | TPRPT |
| 4 | `RT/TPRPT/26/04` | `04` | H.A.G. Gimhani | TPRPT |
| 5 | `RT/TPRPT/26/05` | `05` | H.R.M.N.K. Prebodika | TPRPT |
| 6 | `RT/TPRPT/26/06` | `06` | T. Anushiyan | TPRPT |
| 7 | `RT/TPRPT/26/07` | `07` | R.A.P.G. Karunarathna | TPRPT |
| 8 | `RT/TPRPT/26/09` | `09` | M.M.T. Sankalpana | TPRPT |
| 9 | `RT/TPRPT/26/10` | `10` | K.B.H. Udamya | TPRPT |
| 10 | `RT/TPRPT/26/11` | `11` | K.G. Isuru Madhusanka | TPRPT |
| 11 | `RT/TPRPT/26/12` | `12` | J.M.D.N. Mannaperuma | TPRPT |
| 12 | `RT/TPRPT/26/13` | `13` | P.A. Danindu Naveendra | TPRPT |
| 13 | `RT/TPRPT/26/14` | `14` | M. Rafidh Rizwan | TPRPT |
| 14 | `RT/TPRPT/26/15` | `15` | R.A.D.S.P. Gunasekara | TPRPT |
| 15 | `RT/TPRPT/26/16` | `16` | G.D.M. Rubasinghe | TPRPT |
| 16 | `RT/TPRPT/26/17` | `17` | W.A.T.L. Abesekara | TPRPT |
| 17 | `RT/TPRPT/26/18` | `18` | F.D.R. Bandara | TPRPT |
| 18 | `RT/TPRPT/26/19` | `19` | A.G.H.P. Dayarathna | TPRPT |
| 19 | `RT/TPRPT/26/20` | `20` | S.A.S.S. Samarasinghe | TPRPT |
| 20 | `RT/TPRPT/26/21` | `21` | Yenuki Ruhansa Atapattu | TPRPT |
| 21 | `RT/TPRPT/26/22` | `22` | A.D.R.S. Kumari | TPRPT |
| 22 | `RT/TPRPT/26/23` | `23` | H.A.M. Nimsara | TPRPT |

---

## 3. Academic Subjects & Modules Inventory

### Foundation Programme Modules (Active)
- **ENGLISH** — English Language Skills (Common)
- **DM7** — Digital Media Fundamentals (Common)
- **DM10** — Television Technology & Equipment (Common)
- **ICT** — Information & Communication Technology (Common)
- **GAFFER** — Lighting Principles & Gaffer Techniques (Common)
- **MATHS** — Applied Mathematics for Media (Common)
- **ENG-DRAW** — Engineering Drawing & Studio Blueprints (Common)
- **NVQ-PHYS** — Applied Physics I & II (Common)
- **CGD** — Computer Graphic Design (Common)
- **OSH** — Occupational Safety & Health (Common)

### NVQ Level 5 Diploma Stage Modules (Configured in Schema for Future Progression)
- `POST-5101` — Non-Linear Video Editing & Workflow Systems (TPOPT)
- `PROD-5102` — Multi-Camera Television Studio Production (TPRPT)
- `AUD-5103` — Digital Audio Post-Production & Sound Design (COMMON)
- `PROD-5104` — Cinematic Lighting Design & Camera Optics (TPRPT)
- `POST-5105` — Color Grading & Digital Intermediate Mastering (TPOPT)

---

## 4. UI/UX Blueprint & Design System

The visual identity is derived directly from the four reference screenshots:

```
+-------------------------------------------------------------+
|   [TV B11 Logo]  TV B11 TERMINAL v2.0    [LIVE SYNC / STANDBY]
|   Division of Television Studies · UCR                      |
+-------------------------------------------------------------+
|                                                             |
|  [RADAR SWEEP ANIMATION / ACTIVE ROLL-CALL HUD]            |
|                                                             |
|  [01] SELECT PROGRAMME:                                     |
|  [ TPOPT: Post Production ]   [ TPRPT: Production Tech ]    |
|                                                             |
|  [02] ENTER LAST DIGITS:                                    |
|  RT / TPOPT / 26 / [ 02 ]                                   |
|                                                             |
|  [VERIFIED STUDENT MATCH CARD]                              |
|  P.A. Hesan Samudika  ·  RT/TPOPT/26/02                     |
|                                                             |
|  [ >>> CONFIRM & CHECK IN <<< ]                             |
|                                                             |
+-------------------------------------------------------------+
```

### Color Palette & Visual Elements
- **Background:** Pale icy-blue (`#F1F5F9` to `#E0F2FE`) with technical grid blueprint pattern.
- **Card Surfaces:** High-contrast crisp white (`#FFFFFF`) cards with 2px borders (`#CBD5E1`), subtle rounded corners (`rounded-2xl` to `rounded-3xl`), and cyber corner brackets (`border-t-2 border-l-2 border-[#0088FF]`).
- **Brand Colors:**
  - Primary Electric Blue: `#0088FF` / `#0055CC`
  - High-Tech Cyan: `#38BDF8`
  - Selected TPOPT Accent: `#FF7900` / `#E66C00` (Warm amber/orange)
  - Selected TPRPT Accent: `#0088FF` / `#0055CC` (Electric blue)
  - Success / Verified: `#10B981` / Emerald
  - Alert / Expired: `#EF4444` / Crimson
  - Text: Deep Obsidian Navy (`#0F172A`) for 100% contrast readability.

---

## 5. Security & Architectural Decisions

### 1. Index Suffix Lookup Security Trade-off
- **Convenience:** Students enter only 2 digits (`02`) after selecting their course (`TPOPT` or `TPRPT`).
- **Disambiguation:** Suffix `02` exists in both cohorts; selecting the course first provides unambiguous resolution.
- **Threat Model:** Knowing another student's index suffix allows looking up their name.
- **Safeguards Built-In:**
  - Public endpoint returns **only display name and index number**, no private info.
  - Rate limiting on public endpoints to prevent automated enumeration.
  - **Single Device Lock:** Prevents one device from checking in multiple students (anti-proxy roll-call).
  - Uniqueness constraint in database (`session_id`, `student_id`) strictly prevents double check-ins.

### 2. Dual-Engine Storage Architecture
- **Supabase PostgreSQL:** Primary production database with full RLS, foreign keys, and atomic stored procedures.
- **Resilient Local Database (`db.json`):** Automatic local fallback engine ensuring instant local runnability, complete end-to-end testing without blocking when cloud credentials are pending, and offline safety.

---

## 6. Unresolved Questions & Clarifications
1. **Cloud Supabase Credentials:** Live database connectivity requires new Supabase project URL and keys. The application is built with complete migration scripts (`.sql`) and a local fallback engine so local development and testing pass immediately.
2. **Attendance Start Date:** Authorized calculation engine enforces tracking start on `2026-10-25` / `2026-11-16` without penalizing earlier orientation dates.

