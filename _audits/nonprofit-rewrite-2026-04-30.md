# Nonprofit · Harbor Foundation — proposed rewrite

**Status**: Draft for review · 2026-04-30
**Source of change**: Audit flagged Rosa Patel as "advisor" side across all nonprofit flows, but Rosa is the grantee's Executive Director (client side). Asha Morgan, Program Officer at Harbor, is the foundation staff member (advisor side). The side assignments are inverted throughout.

---

## Tenant metadata

| Field | Was | Now |
|---|---|---|
| `subtitle` | × Safe Streets Initiative — $120k Grantee Onboarding | × Safe Streets Initiative — $120k Grantee Onboarding (unchanged — title is correct) |
| `category` | onboarding | onboarding (unchanged) |

---

## Audit finding — Persona side coherence

**Current state**: Rosa Patel is marked `side="advisor"` in 11+ beat persona definitions across all four flows (default, intake, fraud-fabric, maintenance).

**The problem**: Rosa is the Executive Director of Safe Streets Initiative — the *grantee* organization receiving the grant. By definition, the grantee is **client side**. She is NOT foundation staff; she's not on the advisor side.

**Asha Morgan**, by contrast, is Program Officer at Harbor Foundation. She is foundation staff, which places her on the **advisor side** — the side providing the grant package and routing.

**Impact**: The current side assignments create a coherence error where the grantee (client) is labeled as advisor and vice versa. This propagates across all scenes and usecases.

---

## Fix — persona side reassignment

### nonprofit/default (Scene-by-scene)

**SCENE 1 — Intake (sender webform)**
- Persona: Asha Morgan · Program Officer · Harbor · **advisor** (was: side unspecified; context shows her as program officer configuring the grant, so advisor is correct)
- No persona name change needed; side confirmation needed in data.

**SCENE 2 — Identity**
- Persona: Rosa Patel · Executive Director · Safe Streets Initiative · **client** (was: `side="advisor"`)
- Rosa is the signatory from the grantee, not foundation staff. Switch to `side="client"`.

**SCENE 3 — Signing**
- Persona: Rosa Patel · Executive Director · Safe Streets Initiative · **client** (was: `side="advisor"`)
- Same correction: grantee signatory = client side.

**SCENE 4 — Data**
- Persona: Asha Morgan · Program Officer · Harbor · **advisor** (was: Rosa marked as advisor)
- Asha is the foundation staff reviewing the executed agreement. Rosa should not appear on this scene as an active persona (she's the past signer, not the current reviewer). Keep Asha.

**SCENE 5 — Workspace**
- Persona at B1 (access): Rosa Patel · Executive Director · Safe Streets Initiative · **client** (was: `side="advisor"`)
- Rosa receives access to the shared Workspace as the grantee contact. Client side.
- Persona at B2 onwards (handoff/system): "Harbor × Safe Streets" or "system" (AI assistant Iris) — unchanged.

### nonprofit/intake (usecase, 4 scenes)

**SCENE 1 — Sender webform**
- No named persona in current state (marked "system" with Maestro). Add: Asha Morgan · Program Officer · Harbor · **advisor**.

**SCENE 3 — Envelope delivered**
- Persona: Rosa Patel · Executive Director · Safe Streets Initiative · **client** (was: `side="advisor"`).

**SCENE 4 — Workspace access**
- Persona: Rosa Patel · Executive Director · Safe Streets Initiative · **client** (was: `side="advisor"`).
- Keep consistency with the default flow.

### nonprofit/fraud-fabric (usecase, 3 scenes)

**SCENE 1 — Authenticated portal entry (CLEAR at login)**
- Persona: Rosa Patel · Executive Director · Safe Streets Initiative · **client** (was: `side="advisor"`).
- Rosa is initiating the drawdown request as the grantee's ED.

**SCENE 2 — Drawdown submission**
- Persona: Rosa Patel · Executive Director · Safe Streets Initiative · **client** (was: `side="advisor"`).

**SCENE 3 — Agreement Desk review**
- Persona (B1): Asha Morgan · Program Officer · Harbor · **advisor** (was not explicitly named; context shows Asha reviewing).
- Persona (B2–B5): System (CLEAR, Maestro, Iris) — unchanged.
- Rosa should NOT be marked advisor on this scene; she's the past actor (her session is being reviewed). Asha is the current reviewer.

### nonprofit/maintenance (usecase, 3 scenes)

**SCENE 1 — Portal entry & budget reallocation request**
- Persona: Rosa Patel · Executive Director · Safe Streets Initiative · **client** (was: `side="advisor"`).

**SCENE 2 — Program officer approval**
- Persona: Asha Morgan · Program Officer · Harbor · **advisor** (was: implicit; add explicit persona for clarity on this beat).

**SCENE 3 — Portal update & confirmation**
- Persona: Rosa Patel · Executive Director · Safe Streets Initiative · **client** (was: `side="advisor"`).

---

## Role definitions (for the audit detector)

**Advisor-side roles** (foundation staff): Program Officer, Director of Grants, Grants Manager, Foundation Officer, Director of Programs, Compliance Officer (at foundation), Finance/Grants Administrator.

**Client-side roles** (grantee organization): Executive Director, ED, Board Member, Finance Director (grantee), Program Director (grantee).

**Rosa Patel** is explicitly named as "Executive Director" in multiple beats across all flows. This is unambiguously a client-side role.

**Asha Morgan** is explicitly named as "Program Officer at Harbor Foundation" — unambiguously advisor side.

---

## What this changes downstream

- **Audit detector rule**: Add a side/role coherence check. If a persona is marked `side="advisor"` but has a client-side role keyword (e.g., "Executive Director", "ED", "Board Member"), flag it.
- **Insurance/HLS/PS/Education**: Scan for similar inversions. Insurance · default has Rosa marked as advisor in earlier drafts — this is the same pattern.
- **Nonprofit data refresh**: Once this rewrite is approved, the JSON usecase definitions need to flip Rosa's persona side from advisor → client across all 11+ beat definitions. No name changes needed.

---

## How to apply this

If you approve the rewrite, I'll:

1. Edit `stories/_shared/story-shell.html` — update the nonprofit block: flip Rosa's `side` attribute from "advisor" to "client" in all scene definitions. Add Asha's persona definition to SCENE 4 (data review) where it's currently missing.
2. Update the inline USECASES JSON (`tgk-usecases` script tag) — flip Rosa's side across fraud-fabric, intake, and maintenance usecases.
3. Re-run `_audits/_persona_audit_build.sh` to refresh.
4. The nonprofit rows should re-classify; the side-consistency rule becomes a template for catching this shape elsewhere.

If the role names or flow framing reads off — flag it and I'll revise before applying.
