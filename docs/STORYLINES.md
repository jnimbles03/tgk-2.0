# TGK 2.0 — Procurement & Sales Storyline Sketches

Sketched 2026-04-28. Source materials:

- **Flipbooks** (`/flipbooks/`) — DocuSign CLM Procurement Demo (51 frames), Vendor Agreement Management Renewals (14), Navigator (18), AI-Assisted Review / Iris (19), Workspaces (19), Web Forms / Tally Bank (23), Maestro Workflow Templates (6), IAM for Sales + Agentforce (53)
- **Marketing decks** — *Procurement Intake and Orchestration* (front of lifecycle), *Vendor Agreement Management* (back of lifecycle)
- **Demo videos** — CLM Procurement Demo (contract management specialist drafts → workflow → vendor → legal redline → executive → sign → store), Mary/Ventura → Stellar Logical Agentforce arc (NDA gap → MSA from CRM → AI playbook redline → customer AI summary → Navigator renewal foresight)

Both stories follow the canonical **5-scene spine**: Sender · Identity · Signing · Navigator · Workspace. The procurement story leans on Maestro orchestration end-to-end; the sales story leans on Agentforce + IAM for Sales as the Salesforce-native entry point. AI-Assisted Review by Iris appears in **both** stories as the bridge between drafting and signing.

---

## Procurement: Vendor Renewal at Scale

**Customer cast.** Avis Budget Group (procurement-led; pulled from the deck case study), Neal Jeffs (Senior Director of International Procurement) at the helm. Vendor: a mid-sized fleet maintenance provider whose 36-month MSA expires in 60 days. ~$700M in annual spend across 20,000 suppliers — Neal can't manually shepherd every renewal.

**Why this use case.** The two procurement decks together state the value clearly: **50% of procurement teams manually oversee renewals/obligations** (Word, Excel, calendars), and **15% of contract value leaks** through missed deadlines, unclaimed discounts, and hidden clauses. Vendor Renewal at Scale is the use case where IAM Procurement saves the most measurable money, and it's the one the marketing deck explicitly leads with ("End the chaos — surface terms faster with AI").

**Hero capabilities to feature.**

| Spine slot | Product | What you see |
|---|---|---|
| Scene 1 — Sender | Maestro + Agreement Manager | Renewal alert dashboard surfaces a contract 60 days before expiration. Maestro fans out a renewal package: pre-filled redline, supplier brief, current obligation summary. |
| Scene 2 — Identity | IAM Verify (light touch) | Authorized signer at the supplier verifies; CLEAR / ID.me path is short — the supplier already has a verified identity from the original MSA. |
| Scene 3 — Signing | AI-Assisted Review (Iris) → eSignature | Iris compares the supplier's redline against Avis's playbook, flags drift (e.g., 90-day payment term where standard is 60), and proposes a counter with rationale. Procurement reviewer accepts/modifies in one click. Multi-party signing routes to the supplier and Avis legal. |
| Scene 4 — Navigator | Navigator + Iris | Executed renewal lands in Navigator. Obligation extraction picks up the new term, the new payment schedule, the new SLA credits. Iris answers "what's the new auto-renewal notice window?" with a citation back to clause 14.2. |
| Scene 5 — Workspace | Workspaces + Reporting & Analytics | Persistent renewal-tracking workspace: all 20,000 supplier renewals on one dashboard, sortable by renewal date, contract value, and risk flag. The "Agreements by renewal date" chart from deck slide 5 is the canonical visual here. |

**Beat-by-beat sketch (5 beats per scene).**

### Scene 1 — Sender (Agreement Desk · Maestro)
1. **Renewal alert lands.** Neal opens Avis's procurement dashboard. A red banner: "12 agreements need your attention" (matches Gmail mockup on deck slide 5). One is the fleet maintenance MSA, expiring in 60 days.
2. **Maestro routes the renewal.** Click the row. Maestro fan-out diagram animates: pulls current contract from Navigator, identifies signers (supplier + Avis Legal + Avis VP Operations), pre-stages the redline using the *previous* contract as the baseline.
3. **Pre-fill from Coupa + Navigator.** Supplier address, tax ID, current rate card auto-pull from Coupa. Last-12-months SLA performance auto-pulls from Navigator (since AVMS captures obligations + actuals against them).
4. **Procurement reviews the package.** Neal sees the assembled renewal: red track-changes show Avis's proposed term updates (rate card refresh, new SLA penalties for missed maintenance windows). One-click "Send to supplier."
5. **Handoff to supplier.** Maestro emits a signed Maestro link to the supplier's authorized signer. The activity log at the bottom of the deck's slide 5 mockup shows the email sent.

### Scene 2 — Identity (CLEAR / IAM Verify)
1. **Supplier opens the link.** Tenant-branded email (Avis colors). One CTA: "Review and respond."
2. **Light-touch IDV.** Supplier already verified during original MSA. CLEAR returning-user path: phone verify, no document re-upload. ~6 seconds.
3. **Identity binding.** Verified identity binds to this specific renewal's audit trail.
4. **No third-party redirect.** Avis branding throughout the verification.
5. **Renewal package unlocked.** Supplier lands in the agreement viewer.

### Scene 3 — Signing (AI-Assisted Review → eSignature)
1. **Supplier proposes counter-redlines.** They strike Avis's new SLA penalties, push payment terms from net-60 to net-90, add a force-majeure carve-out. Save and return.
2. **Iris compares against playbook.** Avis's playbook says: payment terms ≤ net-60, no force-majeure carve-outs without VP signoff, SLA penalties non-negotiable for tier-1 suppliers. Iris flags all three with severity badges.
3. **Iris drafts the counter.** For each flagged change: suggested counter language + rationale ("Tier-1 supplier playbook clause 4.3 — SLA penalties are non-negotiable in this category"). Neal accepts two, escalates the force-majeure to legal.
4. **Multi-party route.** Avis Legal reviews force-majeure for 12 minutes, accepts. Avis VP Operations approves the package. Supplier counter-signs. eSignature ceremony for all three parties.
5. **Executed.** Three signed copies land in inboxes. The signing certificate captures every event: Iris's flag-and-counter cycle, the 12-minute legal review, the VP approval.

### Scene 4 — Navigator (post-signature insight)
1. **Renewal hits Navigator.** AI-assisted banner: "Agreement extracted by Iris — 47 fields captured." The new MSA shows up in the agreement list with the new term, new rate card, new SLA credits.
2. **Obligation diff against prior MSA.** Side-by-side panel shows what changed: payment terms (60 days, unchanged), SLA penalty cap (raised from $50K to $200K per quarter), force-majeure language (clause 14.7, new).
3. **Renewal date set.** Auto-set 60 days before next expiration. Navigator schedules the next renewal alert.
4. **Iris query.** Neal asks "what's the new auto-renewal notice window for this contract?" Iris returns: "60 days written notice, per clause 14.2" with a clickable citation that jumps to the clause in the document.
5. **Reporting.** Navigator dashboard updates: 1 of 12 renewals closed, 11 in-flight. Aggregate value of closed renewals: $1.4M. Average days from alert to executed: 19 (down from 73 pre-IAM, per the deck's productivity claim).

### Scene 5 — Workspace (operational continuity)
1. **Persistent supplier workspace.** All parties (Avis Procurement, Avis Legal, Avis VP Ops, Supplier authorized signers, Supplier ops) land in a Workspace tied to this contract.
2. **Living renewal calendar.** "Next 6 months" strip on the workspace home shows three upcoming renewals across this supplier's family of agreements (this MSA, two regional addenda). All authorized parties see the same dates.
3. **In-flight obligations.** SLA performance tracks live. When the supplier misses a maintenance window, Workspace pings Avis's Operations team and auto-references the new SLA penalty clause.
4. **Conversational drill-down.** Avis Legal asks "show me all force-majeure invocations in the last 24 months across this supplier" — Iris answers from Navigator, scoped by the workspace's contract family.
5. **Aggregate impact.** Closing card: across 20,000 suppliers, the deck's claimed outcomes — *eliminate 3-9% value leakage*, *32-50% higher productivity*, *better negotiating position* — are now visible as live metrics in the same workspace.

**Hand-off notes.**

- Drilling MSA storyline (existing) is structurally identical — same 5 scenes, just with Black Mesa × Tritan as the tenant pair instead of Avis × fleet supplier. Drilling MSA stays as the *playable* storyline; Vendor Renewal at Scale is the *strategic* one we sketch next.
- *New Supplier Onboarding* (the other procurement use case in step 2) is a cousin — same 5 scenes, but Scene 1 is Web Forms intake instead of Maestro renewal alert, and Scene 4 is "new supplier in Navigator" instead of "renewal diff." Worth building next, since the deck explicitly shows the Web Forms / Workflow Builder / AI-Assisted Review / eSignature stack on slide 6.

---

## Sales: Agentforce-Driven Close (NDA → MSA → Renewal)

**Customer cast.** Mary, enterprise seller at Ventura. Customer: Stellar Logical (already lifted from the Mary/Ventura video). Supporting cast: Leona from Ventura Legal, Jack Rogers from Stellar Logical's procurement team.

**Why this use case.** The Mary/Ventura video is the most coherent end-to-end sales narrative we have — every step lives natively inside Salesforce, with Agentforce as the conversational entry point and DocuSign IAM as the engine underneath. It traces an entire revenue lifecycle (NDA → MSA → executed → sync to CRM → renewal foresight 11 months later) without leaving Salesforce. Two clean payoffs to land: **(a)** routine steps don't interrupt seller productivity, **(b)** "every executed agreement becomes searchable live data that feeds forecasting, renewal planning, and margin analysis."

**Hero capabilities to feature.**

| Spine slot | Product | What you see |
|---|---|---|
| Scene 1 — Sender | Agentforce + IAM for Sales | Mary asks Agentforce "does Stellar Logical have an active NDA?" inside Salesforce. Agentforce queries Navigator, finds an expired NDA, offers to send a new one pre-filled from CRM. One click → sent. |
| Scene 2 — Identity | IAM (Salesforce-bound auth) | Stellar Logical signer authenticates via existing Salesforce identity binding. Mary launches the MSA from the same opportunity record — pre-merged account details, pre-applied template, auto-routed by contract value. |
| Scene 3 — Signing | AI-Assisted Review (Iris) on both sides | Customer (Jack) sends back redlines. Auto-routes to Leona in Legal. Iris compares to Ventura's playbook, flags 60-day payment term (standard is 30), proposes counter with rationale. Jack also uses Iris on his side to summarize the contract — "what are the down payment terms?" — Iris answers with clause citation. |
| Scene 4 — Navigator | Navigator + Salesforce-embedded repository | DocuSign Agreements tab in Salesforce shows every executed NDA, MSA, order. Searchable by clause. Feeds forecasting, renewal planning, margin analysis. |
| Scene 5 — Workspace | Agentforce + Navigator (renewal foresight) | 11 months later, Mary preps for QBR. "Agentforce, top renewals next 6 months by contract value?" — surfaces them with notice deadlines pulled from Navigator. She initiates renewal discussions ahead of schedule. |

**Beat-by-beat sketch (5 beats per scene).**

### Scene 1 — Sender (Agentforce + IAM for Sales)
1. **Mary opens the opportunity.** Stellar Logical opp at Salesforce stage "Quote." She needs to send a quote, but first the basics — does an active NDA exist?
2. **Asks Agentforce.** Conversational query inside the opportunity panel: "does Stellar Logical have an active NDA?" Agentforce queries Navigator behind the scenes.
3. **Expired NDA found.** Agentforce returns: "Last NDA executed 14 months ago, expired 60 days ago. Want me to send a new one?" Pre-fills from CRM (Stellar Logical legal contact, signing authority).
4. **One-click send.** Mary says yes. NDA sends for signature. Activity log on the opportunity records the event with a link back to the NDA.
5. **Mary moves on.** She doesn't have to dig through folders or ping Legal. The seller stays in the seller's swim lane.

### Scene 2 — Identity (Salesforce-bound auth + MSA launch)
1. **Stellar Logical signs the NDA.** Light-touch identity (CLEAR returning user, since they verified for the prior NDA).
2. **Mary launches the MSA.** Single click from the opportunity record. CLM template auto-applies, account details auto-merge from Salesforce.
3. **Routing auto-determined.** Contract value × terms → routes to Stellar Logical procurement (Jack), then to Ventura Legal (Leona), then to Mary's VP for >$500K deals.
4. **Status visible inline.** Mary sees the MSA status in the same opportunity screen — no email chains, no swivel-chair to a separate CLM portal.
5. **Activity log.** Double-click the agreement → detailed activity log with links to the doc, the routing rules, the email events.

### Scene 3 — Signing (AI-Assisted Review on both sides)
1. **Customer redlines.** Jack reviews the MSA, pushes payment terms from net-30 to net-60, adds a termination-for-convenience clause. Returns to Leona (Ventura Legal).
2. **Iris compares to playbook.** Ventura's playbook: net-30 standard, no termination-for-convenience without VP signoff. Iris flags both with severity badges.
3. **Iris drafts the counter.** "Standard payment terms are net-30. Counter: net-30, with 1.5% early-pay discount inside 10 days. Rationale: maintains receivables target while offering value back to customer." Leona accepts.
4. **Jack uses Iris on his side.** Receives the countered MSA. Asks Iris "what are the down payment terms?" — Iris returns a summary, clickable citation to clause 6.1. Jack signs confidently in minutes instead of hours of line-by-line review.
5. **Executed.** Both parties sign. Salesforce opportunity moves to "Closed Won." Finance provisioning kicks off automatically.

### Scene 4 — Navigator (post-signature, in Salesforce)
1. **DocuSign Agreements tab in Salesforce.** Every executed NDA, MSA, order from the relationship is here. Native Salesforce surface.
2. **Searchable by clause.** "Show me all MSAs with custom payment terms in the last 12 months" — instant results across the company's portfolio.
3. **Feeds forecasting.** Mary's pipeline view now shows committed renewal dates (from Navigator), not just expected close dates. Sales ops uses this for capacity planning.
4. **Margin analysis.** Finance pulls aggregate concession data ("how often do we agree to net-60 on >$1M deals?") from Navigator, not from spreadsheet exports.
5. **Single shared truth.** Sales, sales ops, legal, and finance work from the same agreement data — directly inside Salesforce.

### Scene 5 — Workspace (renewal foresight, 11 months later)
1. **QBR prep.** Mary is preparing for her quarterly business review. Instead of spreadsheet hunting, she asks Agentforce.
2. **"Top renewals next 6 months, highest contract value."** Agentforce surfaces the list instantly. Stellar Logical MSA appears — $1.2M ARR, renewal date in 4 months, notice deadline in 2 months.
3. **Iris answers detail questions.** "What's the deadline for a notice of non-renewal?" — Iris: "60 days before expiration — that's [date]." Direct link to clause 14.2 in the MSA.
4. **Mary initiates renewal early.** She reaches out to Stellar Logical 30 days *before* the notice deadline. Stellar Logical's procurement team appreciates the lead time. Renewal closes 45 days early at favorable terms.
5. **Closing frame.** Tagline lands: *"Every step of the revenue journey from NDA to renewal is intelligent and connected — powered by DocuSign, integrated with Salesforce, accelerated by AI."*

**Hand-off notes.**

- Mary/Ventura/Stellar Logical names come straight from the video — keep them so the storyline matches the marketing asset frame-for-frame.
- The Agentforce conversational beats (Scene 1, Scene 5) are the *signature moments* that differentiate this story from a generic IAM demo. Don't let them get cut for time.
- *CPQ-to-Sign* and *Channel Partner* (the other two sales use cases in step 2) are deferred until the IAM for Sales + Agentforce flipbook narrative is fully built, since they share Scene 4 (Navigator-in-CRM) but diverge sharply at Scenes 1-3.

---

## Capability cross-reference — what each story uses

|  | Procurement / Vendor Renewal | Sales / Agentforce |
|---|---|---|
| **Maestro** | Renewal package fan-out (Scene 1) | — |
| **Agreement Desk** | Procurement reviewer surface (Scene 1) | — |
| **Web Forms** | (Used in New Supplier Onboarding instead) | — |
| **Agentforce** | — | Scene 1 (NDA gap query), Scene 5 (renewal foresight) |
| **CLM templates** | Scene 1 (renewal redline baseline) | Scene 2 (MSA template auto-applied) |
| **CLEAR / IAM Verify** | Scene 2 (light-touch returning user) | Scene 2 (Salesforce-bound identity) |
| **AI-Assisted Review (Iris)** | Scene 3 (playbook drift, counter draft) | Scene 3 (playbook drift, counter draft, customer-side summary) |
| **eSignature** | Scene 3 (multi-party ceremony) | Scene 3 (multi-party ceremony) |
| **Navigator** | Scene 4 (obligation diff, Iris citations) | Scene 4 (Salesforce-embedded repository) |
| **Workspaces** | Scene 5 (persistent supplier workspace) | — |
| **Reporting & Analytics** | Scene 5 (renewal pipeline dashboard) | Scene 4 (margin analysis), Scene 5 (renewal foresight) |
| **Salesforce / Agentforce binding** | — | Scenes 1, 2, 4, 5 |

Both stories share Scenes 2-4 architecturally. The differentiation is at Scene 1 (Maestro orchestration vs. Agentforce conversational) and Scene 5 (operational workspace vs. renewal foresight in CRM).

---

## What's missing for full implementation

1. **Vendor Renewal storyline player** — needs a new VERTICALS entry (`procurement-vendor-renewal`?) in `stories/_shared/story-shell.html`, mirroring the existing wealth/banking/insurance templates. Borrow scene templates from the spine library; only the narration changes.
2. **Sales storyline player** — same; new VERTICALS entry (`sales-agentforce`?). May need a Salesforce-themed visual treatment for the Agentforce conversational beats, since none of the existing scene templates show a CRM surface.
3. **Frame harvesting** — the IAM for Sales + Agentforce flipbook (53 frames) is the richest source for sales scene templates. Run `screenshot-harvester` against it to extract reference frames if we go to build.
4. **Importer support for new VERTICALS keys** — `scripts/import_storylines.py` already handles arbitrary keys, but the unified picker's CATALOG (in `index-unified.html`) would need entries if we want the new stories surfaced through both the function-first (geos) and vertical-first (unified) front doors.
