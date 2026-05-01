# Education · Maple Ridge — proposed rewrite

**Status**: Draft for review · 2026-04-30
**Source of change**: Persona side audit reveals systematic error: Priya Shah (student, client-side) is tagged as `advisor` in all four flows. Root cause: audit detector inherits "advisor" as fallback for null personas; education's audience is the student, not institutional staff. Resolved as: Priya = client (student); add advisory personas per scene for registrar, admissions, financial aid staff who serve as the institutional receiver.

---

## Domain rules applied

- **Naming policy**: Fictional names only. Priya Shah already fictional.
- **Front-office roles for education**: Director of Admissions, Registrar, Enrollment Specialist, Director of Financial Aid, Student Onboarding Coordinator, Academic Advisor, Director of Student Services.
- **Student = client side**. Priya is the customer of Maple Ridge; she completes self-service intake, identity verification, signing, and holds Workspace access throughout her student journey.
- **Maple Ridge = tenant** (school district). Jamal Rivers (admissions), Registrar staff, Financial Aid staff are advisor-side (institutional).
- **No TGK Capital in education**. Reserved for wealth + banking verticals only.

---

## CAST

### Client
- **Priya Shah** · Student · Maple Ridge · Client side
- (optional parent persona for parent-PLUS scenarios)

### Advisor (institutional staff, per scene)
- **Jamal Rivers** · Enrollment Specialist · Maple Ridge Admissions · Advisor side
- **Registrar** (title TBD, referenced as "Registrar") · Maple Ridge Registrar's Office · Advisor side
- **Financial Aid Officer** (title TBD, referenced as "Financial Aid") · Maple Ridge Financial Aid · Advisor side
- **Academic Advisor** (name TBD, referenced as "Academic Advisor") · Maple Ridge Student Services · Advisor side

---

## education/default — Fall 2026 Student Onboarding

### SCENE 1 — Intake (self-service portal)

**Tag** (unchanged): SCENE 1 OF 5 · INTAKE · SELF-SERVICE STUDENT PORTAL

**Persona — was**:
> Priya Shah · Student · Maple Ridge · **advisor** ← INCORRECT

**Persona — now**:
> Priya Shah · Student · Maple Ridge · **client**

**Advisor receiver** (new):
> Jamal Rivers · Enrollment Specialist · Maple Ridge · advisor

**Scene head** (unchanged, already correct):
> Priya completes new-student onboarding through Maple Ridge's student portal.

**Scene lede — refinement**:
> Priya Shah opens Maple Ridge's student portal the week before move-in and completes new-student onboarding — enrollment selections, financial aid acceptance, housing preferences, immunization records. The submission lands in Jamal Rivers' admissions intake queue. The workflow assembles the four-document onboarding packet; Jamal reviews and routes all departments simultaneously from Workspaces.

### SCENE 2 — Identity

**Persona — was**:
> Priya Shah · Student · Maple Ridge · **advisor** ← INCORRECT

**Persona — now**:
> Priya Shah · Student · Maple Ridge · **client**

**Scene head** (unchanged, already correct):
> Priya completes identity verification.

### SCENE 3 — Signing

**Persona — was**:
> Priya Shah · Student · Maple Ridge · **advisor** ← INCORRECT

**Persona — now**:
> Priya Shah · Student · Maple Ridge · **client**

**Scene head** (unchanged):
> Priya signs enrollment, aid, housing, and tuition.

**Scene lede — refinement**:
> Four documents in one ceremony — enrollment form, financial aid acceptance, housing contract, tuition agreement. Residence life, bursar, registrar, and financial aid director all notified simultaneously from the workflow's post-execution routing.

### SCENE 4 — Data

**Persona — was**:
> Priya Shah · Student · Maple Ridge · **advisor** ← INCORRECT

**Persona — now**:
> Jamal Rivers · Enrollment Specialist · Maple Ridge · **advisor**

**Scene head** (unchanged):
> The agreement repository lands Priya's record in the SIS.

**Scene lede** (unchanged, already references Jamal):
> The agreement repository pulls 13 fields — program, cohort, PCP assigned to Health Services, housing assignment, meal plan. The AI assistant answers "when are Priya's aid disbursements and what's she still missing?" from the record.

**Beat B4 lede** (unchanged):
> Jamal asks the AI assistant about Priya's aid disbursements.

### SCENE 5 — Workspace

**Persona — was**:
> Priya Shah · Student · Maple Ridge · **advisor** ← INCORRECT

**Persona — now**:
> Priya Shah · Student · Maple Ridge · **client**

**Scene head** (unchanged):
> Maple Ridge, Priya, and her advisor continue in one Workspace.

---

## education/intake — Financial-Aid Acceptance and MPN Signature

### SCENE 1

**Persona — was**:
> Priya Shah · Student · Maple Ridge · **advisor** ← INCORRECT (beat-level, multiple instances)

**Persona — now**:
> Priya Shah · Student · Maple Ridge · **client**

**Scene head** (unchanged):
> Priya completes financial-aid acceptance on Maple Ridge's student portal.

**Beat corrections**: All beat-level personas showing "Priya Shah · advisor" → "Priya Shah · client"

### SCENE 2 (Maestro Packages)

**Personas — were**:
> B1 · Maestro · system (correct)
> B3 · Priya Shah · **advisor** ← INCORRECT
> B5 · Priya Shah · **advisor** ← INCORRECT

**Personas — now**:
> B1 · Maestro · system (unchanged)
> B3 · Priya Shah · **client**
> B5 · Priya Shah · **client**

### SCENE 3 (Envelope Delivered / Signing)

**Personas — were**:
> B1 · Priya Shah · **advisor** ← INCORRECT
> (multiple system personas correct)

**Personas — now**:
> B1 · Priya Shah · **client**
> (system personas unchanged)

---

## education/maintenance — Address + Emergency Contact Update

### SCENE 1 (Portal Entry)

**Personas — were**:
> B1 · Priya Shah · **advisor** ← INCORRECT (multiple)
> B3 · Priya Shah · **advisor** ← INCORRECT
> B4 · Priya Shah · **advisor** ← INCORRECT

**Personas — now**:
> B1 · Priya Shah · **client**
> B3 · Priya Shah · **client**
> B4 · Priya Shah · **client**

**Advisor receiver** (new):
> Registrar · Maple Ridge Registrar's Office · advisor (appears in Scene 3)

### SCENE 2 (In-Session Action)

**Personas — were**:
> B3 · Priya Shah · **advisor** ← INCORRECT
> B4 · Priya Shah · **advisor** ← INCORRECT

**Personas — now**:
> B3 · Priya Shah · **client**
> B4 · Priya Shah · **client**

### SCENE 3 (Registrar Review)

**Personas — were**:
> B1 · Priya Shah · **advisor** ← INCORRECT
> B3 · Priya Shah · **advisor** ← INCORRECT
> B4 · Priya Shah · **advisor** ← INCORRECT
> B5 · Priya Shah · **advisor** ← INCORRECT

**Personas — now**:
> B1 · Registrar · **advisor** (institutional receiver, corrected subject)
> B3 · Priya Shah · **client** (authentication context from her side)
> B4 · Registrar · **advisor** (confirms the change)
> B5 · Priya Shah · **client** (sees the change reflected)

---

## education/fraud-fabric — Official Transcript Release (FERPA)

### SCENE 1 (Portal Entry)

**Personas — were**:
> B1 · Priya Shah · **advisor** ← INCORRECT (multiple)

**Personas — now**:
> B1 · Priya Shah · **client**

**System personas** (unchanged):
> B2 · CLEAR · system
> B3 · CLEAR · system
> B4 · Maestro · system

### SCENE 2 (In-Session Action)

**Personas — were**:
> B1 · Priya Shah · **advisor** ← INCORRECT
> B3 · Priya Shah · **advisor** ← INCORRECT
> B5 · Priya Shah · **advisor** ← INCORRECT

**Personas — now**:
> B1 · Priya Shah · **client**
> B3 · Priya Shah · **client**
> B5 · Priya Shah · **client**

**System personas** (unchanged):
> B2 · Maestro · system
> B4 · Iris · system

### SCENE 3 (Chain of Custody)

**Personas — were**:
> B1 · Priya Shah · **advisor** ← INCORRECT
> B2 · CLEAR · system (correct)

**Personas — now**:
> B1 · Registrar · **advisor** (institutional receiver, corrected subject — the "Agreement Desk" is the Registrar's view)
> B2 · CLEAR · system (unchanged)

**System personas** (unchanged):
> B3 · Iris · system
> B5 · (already null, correct)

---

## What this changes downstream

- **Persona audit detector**: Add a coherence check — `side="advisor"` must align with actual institutional or professional role keywords. "Student" alone always indicates client side, regardless of null fallback.
- **Education domain baseline**: Priya Shah = client across all flows. Institutional staff (Jamal, Registrar, Financial Aid, Academic Advisor) = advisor side. No TGK Capital references.
- **Intake / Fraud-Fabric / Maintenance flows**: All three inherit the same fix — Priya's side flips from advisor to client, and scene-level advisor personas name the institutional receiver (Registrar, Financial Aid, etc.).
- **Other verticals**: Scan for same shape (student/learner/participant personas tagged as advisor) in any future education-adjacent verticals.

---

## How to apply this

If you approve the rewrite, I'll:

1. Edit `stories/_shared/story-shell.html` — replace the `education:` block persona definitions and scene ledes with the "Now" versions above. One commit.
2. Edit the relevant sections in `_audits/usecase-narrations-2026-04-27.json` — flip Priya's persona side from "advisor" to "client" across intake, fraud-fabric, and maintenance flows.
3. Re-run `_audits/_persona_audit_build.sh` so the persona-sequence-data.json refreshes with corrected audit verdicts.
4. The education rows should all re-classify to reflect Priya as client and institutional staff as advisor. This becomes the baseline for any education-adjacent verticals added later.

If anything reads off — persona names, institutional roles, domain framing — flag it inline and I'll revise before applying.
