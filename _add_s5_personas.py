#!/usr/bin/env python3
"""Add S5 advisor personas for HLS family"""

shell_path = '/sessions/intelligent-admiring-cannon/mnt/TGK 2.0/stories/_shared/story-shell.html'

with open(shell_path, 'r') as f:
    content = f.read()

# Provider S5: Add advisor persona for Dr. Sarah Reyes
content = content.replace(
    '{tag:"SCENE 5 OF 5 · WORKSPACE", head:"Jordan, the PCP, and the care team continue in one Workspace.",\n       lede:`<p>Prior auths, referrals, lab uploads, visit notes — all in the patient Workspace.</p><p>The family sees the same state as the care team, with the agent running eligibility checks behind the scenes.</p>`,\n       persona:{side:"client", name:"Jordan Kim", role:"Patient · Riverside Health"},\n       beats:[',
    '{tag:"SCENE 5 OF 5 · WORKSPACE", head:"Jordan, the PCP, and the care team continue in one Workspace.",\n       lede:`<p>Prior auths, referrals, lab uploads, visit notes — all in the patient Workspace.</p><p>The family sees the same state as the care team, with the agent running eligibility checks behind the scenes.</p>`,\n       persona:{side:"client", name:"Jordan Kim", role:"Patient · Riverside Health", advisor:{side:"advisor", name:"Dr. Sarah Reyes", role:"Primary Care Physician · Riverside Health"}},\n       beats:['
)

# Lifesciences S5: Add advisor persona for Dr. Rebecca Okonkwo
content = content.replace(
    '{tag:"SCENE 5 OF 5 · WORKSPACE", head:"Helix, ARC, and the IRB continue in one Workspace.",\n       lede:`<p>Amendments, safety letters, deviation reports, invoicing — all in the site Workspace.</p><p>When IB v6 releases, every site sees it simultaneously and the acknowledgment round-robin kicks off.</p>`,\n       persona:{side:"advisor", name:"Ethan Park", role:"Clinical Study Manager · Helix"},\n       beats:[',
    '{tag:"SCENE 5 OF 5 · WORKSPACE", head:"Helix, ARC, and the IRB continue in one Workspace.",\n       lede:`<p>Amendments, safety letters, deviation reports, invoicing — all in the site Workspace.</p><p>When IB v6 releases, every site sees it simultaneously and the acknowledgment round-robin kicks off.</p>`,\n       persona:{side:"advisor", name:"Dr. Rebecca Okonkwo", role:"Regulatory Affairs Lead · Helix"},\n       beats:['
)

# Payor S5: Add advisor persona for Dr. Mitchell Torres
content = content.replace(
    '{tag:"SCENE 5 OF 5 · WORKSPACE", head:"Unity, Marcus, and the PCP continue in one Workspace.",\n       lede:`<p>Prior auths, ID card, welcome kit, plan changes — all in the member Workspace.</p><p>Open enrollment reminders route through the same space the moment they\'re due.</p>`,\n       persona:{side:"client", name:"Marcus Chen", role:"Member · Unity Health Plan"},\n       beats:[',
    '{tag:"SCENE 5 OF 5 · WORKSPACE", head:"Unity, Marcus, and the PCP continue in one Workspace.",\n       lede:`<p>Prior auths, ID card, welcome kit, plan changes — all in the member Workspace.</p><p>Open enrollment reminders route through the same space the moment they\'re due.</p>`,\n       persona:{side:"client", name:"Marcus Chen", role:"Member · Unity Health Plan", advisor:{side:"advisor", name:"Dr. Mitchell Torres", role:"Network Operations Manager · Unity Health Plan"}},\n       beats:['
)

# Provider-ROI S5: Add advisor persona for Dr. James Kowalski
content = content.replace(
    '{tag:"SCENE 5 OF 5 · WORKSPACE", head:"Catalina, Eric, and Silver Mountain continue in one Workspace.",\n       lede:`<p>Subsequent records requests, supplemental scope, fee tracking — all in the request Workspace.</p><p>The Certificate of Completion logs every release event with timestamp, recipient, and scope — Catalina\'s compliance team has it audit-ready on demand.</p>`,\n       persona:{side:"advisor", name:"Renata López", role:"Health Information Manager · Catalina Medical Center"},\n       beats:[',
    '{tag:"SCENE 5 OF 5 · WORKSPACE", head:"Catalina, Eric, and Silver Mountain continue in one Workspace.",\n       lede:`<p>Subsequent records requests, supplemental scope, fee tracking — all in the request Workspace.</p><p>The Certificate of Completion logs every release event with timestamp, recipient, and scope — Catalina\'s compliance team has it audit-ready on demand.</p>`,\n       persona:{side:"advisor", name:"Dr. James Kowalski", role:"Privacy Officer · Catalina Medical Center"},\n       beats:['
)

with open(shell_path, 'w') as f:
    f.write(content)

print("✓ S5 advisor personas added for all HLS verticals")
