#!/usr/bin/env python3
"""Simple HLS fixes - just string replacements"""

shell_path = '/sessions/intelligent-admiring-cannon/mnt/TGK 2.0/stories/_shared/story-shell.html'

with open(shell_path, 'r') as f:
    content = f.read()

# All renamed replacements

# Provider S1: Add persona after lede
content = content.replace(
    'The submission lands in Riverside\'s intake queue. The workflow assembles the patient packet; Daniela Okafor reviews from Workspaces.</p>",\n       beats:[',
    'The submission lands in Riverside\'s intake queue. The workflow assembles the patient packet; Daniela Okafor reviews from Workspaces.</p>",\n       persona:{side:"client", name:"Jordan Kim", role:"Patient · Riverside Health"},\n       beats:['
)

# Lifesciences S1: Add persona after lede
content = content.replace(
    'The workflow fans out the activation packet from his selections: CTA, budget, FDA-1572, IRB approval, financial disclosure.</p>",\n       beats:[',
    'The workflow fans out the activation packet from his selections: CTA, budget, FDA-1572, IRB approval, financial disclosure.</p>",\n       persona:{side:"advisor", name:"Ethan Park", role:"Clinical Study Manager · Helix"},\n       beats:['
)

# Payor S1: Add persona after lede
content = content.replace(
    'The application lands in Unity\'s enrollment queue. The workflow assembles the enrollment packet; Brenda Estevez in Member Services reviews from Workspaces.</p>",\n       beats:[',
    'The application lands in Unity\'s enrollment queue. The workflow assembles the enrollment packet; Brenda Estevez in Member Services reviews from Workspaces.</p>",\n       persona:{side:"client", name:"Marcus Chen", role:"Member · Unity Health Plan"},\n       beats:['
)

# Provider-ROI S1: Add persona and fix Renata name
content = content.replace(
    'The Desk parses the request, matches the patient, and routes to Renata Voss in HIM. The consent packet generates automatically.</p>",\n       beats:[',
    'The Desk parses the request, matches the patient, and routes to Renata López in HIM. The consent packet generates automatically.</p>",\n       persona:{side:"advisor", name:"Renata López", role:"Health Information Manager · Catalina Medical Center"},\n       beats:['
)

# Also fix all remaining Renata Voss -> Renata López
content = content.replace('Renata Voss', 'Renata López')

# Dr. Sarah Chen -> Dr. Sarah Reyes
content = content.replace('Dr. Sarah Chen', 'Dr. Sarah Reyes')

with open(shell_path, 'w') as f:
    f.write(content)

print("✓ HLS family fixes applied completely")
