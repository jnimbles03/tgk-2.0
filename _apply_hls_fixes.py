#!/usr/bin/env python3
"""Apply approved HLS family persona fixes to story-shell.html"""

import json
import re

# Path to files
shell_path = '/sessions/intelligent-admiring-cannon/mnt/TGK 2.0/stories/_shared/story-shell.html'

# Read story-shell.html
with open(shell_path, 'r') as f:
    shell_content = f.read()

# HLS Persona Fixes for story-shell.html

# PROVIDER: Add S1 persona (client: Jordan Kim)
shell_content = re.sub(
    r'(lede:"<p><span class="em">Jordan Kim</span> opens Riverside Health\'s patient portal[^"]*"[^,]*),\s*beats:\[',
    r'\1,\n       persona:{side:"client", name:"Jordan Kim", role:"Patient · Riverside Health"},\n       beats:[',
    shell_content,
    count=1
)

# PROVIDER: Add S4 persona (advisor: Daniela Okafor)
shell_content = re.sub(
    r'({tag:"SCENE 4 OF 5 · DATA", head:"The agreement repository lands the patient record in Riverside\'s EHR\.",\n       lede:`<p>The agreement repository extracts 11 fields[^`]*`[^,]*),\s*beats:\[',
    r'\1,\n       persona:{side:"advisor", name:"Daniela Okafor", role:"Registrar · Riverside Health"},\n       beats:[',
    shell_content,
    count=1
)

# PROVIDER: Add S5 personas (client: Jordan Kim)
shell_content = re.sub(
    r'({tag:"SCENE 5 OF 5 · WORKSPACE", head:"Jordan, the PCP, and the care team continue in one Workspace\.",\n       lede:`<p>Prior auths, referrals, lab uploads[^`]*`[^,]*),\s*beats:\[',
    r'\1,\n       persona:{side:"client", name:"Jordan Kim", role:"Patient · Riverside Health"},\n       beats:[',
    shell_content,
    count=1
)

# PROVIDER: Rename Dr. Sarah Chen to Dr. Sarah Reyes (provider-only)
shell_content = shell_content.replace(
    'Dr. Sarah Chen',
    'Dr. Sarah Reyes'
)

# PAYOR: Add S1 persona (client: Marcus Chen)
shell_content = re.sub(
    r'(lede:"<p><span class="em">Marcus Chen</span> compares plans on Unity Health Plan\'s marketplace[^"]*"[^,]*),\s*beats:\[',
    r'\1,\n       persona:{side:"client", name:"Marcus Chen", role:"Member · Unity Health Plan"},\n       beats:[',
    shell_content,
    count=1
)

# PAYOR: Add S4 persona (advisor: Brenda Estevez)
shell_content = re.sub(
    r'({tag:"SCENE 4 OF 5 · DATA", head:"The agreement repository extracts Marcus\'s member record\.",\n       lede:`<p>The agreement repository pulls 9 fields[^`]*`[^,]*),\s*beats:\[',
    r'\1,\n       persona:{side:"advisor", name:"Brenda Estevez", role:"Member Services Representative · Unity Health Plan"},\n       beats:[',
    shell_content,
    count=1
)

# PAYOR: Add S5 personas (client: Marcus Chen)
shell_content = re.sub(
    r'({tag:"SCENE 5 OF 5 · WORKSPACE", head:"Unity, Marcus, and the PCP continue in one Workspace\.",\n       lede:`<p>Prior auths, ID card, welcome kit[^`]*`[^,]*),\s*beats:\[',
    r'\1,\n       persona:{side:"client", name:"Marcus Chen", role:"Member · Unity Health Plan"},\n       beats:[',
    shell_content,
    count=1
)

# LIFESCIENCES: Add S1 persona (advisor: Ethan Park)
shell_content = re.sub(
    r'(lede:"<p>Ethan Park, Clinical Study Manager at Helix, opens the site-activation webform[^"]*"[^,]*),\s*beats:\[',
    r'\1,\n       persona:{side:"advisor", name:"Ethan Park", role:"Clinical Study Manager · Helix"},\n       beats:[',
    shell_content,
    count=1
)

# LIFESCIENCES: Add S4 persona (advisor: Ethan Park)
shell_content = re.sub(
    r'({tag:"SCENE 4 OF 5 · DATA", head:"The agreement repository extracts the site file into the study binder\.",\n       lede:`<p>The agreement repository pulls 26 fields[^`]*`[^,]*),\s*beats:\[',
    r'\1,\n       persona:{side:"advisor", name:"Ethan Park", role:"Clinical Study Manager · Helix"},\n       beats:[',
    shell_content,
    count=1
)

# LIFESCIENCES: Add S5 personas (advisor: Dr. Rebecca Okonkwo)
shell_content = re.sub(
    r'({tag:"SCENE 5 OF 5 · WORKSPACE", head:"Helix, ARC, and the IRB continue in one Workspace\.",\n       lede:`<p>Amendments, safety letters, deviation reports[^`]*`[^,]*),\s*beats:\[',
    r'\1,\n       persona:{side:"advisor", name:"Dr. Rebecca Okonkwo", role:"Regulatory Affairs Lead · Helix"},\n       beats:[',
    shell_content,
    count=1
)

# PROVIDER-ROI: Add S1 persona (advisor: Renata López)
shell_content = re.sub(
    r'(lede:"<p>A release-of-information request arrives at Catalina Medical\'s Agreement Desk[^"]*"[^,]*),\s*beats:\[',
    r'\1,\n       persona:{side:"advisor", name:"Renata López", role:"Health Information Manager · Catalina Medical Center"},\n       beats:[',
    shell_content,
    count=1
)

# PROVIDER-ROI: Add S4 persona (advisor: Renata López)
shell_content = re.sub(
    r'({tag:"SCENE 4 OF 5 · DATA", head:"The agreement repository stages the records packet[^"]*",\n       lede:`<p>The agreement repository extracts the assembled packet[^`]*`[^,]*),\s*beats:\[',
    r'\1,\n       persona:{side:"advisor", name:"Renata López", role:"Health Information Manager · Catalina Medical Center"},\n       beats:[',
    shell_content,
    count=1
)

# PROVIDER-ROI: Add S5 personas (advisor: Dr. James Kowalski)
shell_content = re.sub(
    r'({tag:"SCENE 5 OF 5 · WORKSPACE", head:"Catalina, Eric, and Silver Mountain continue in one Workspace\.",\n       lede:`<p>Subsequent records requests, supplemental scope[^`]*`[^,]*),\s*beats:\[',
    r'\1,\n       persona:{side:"advisor", name:"Dr. James Kowalski", role:"Privacy Officer · Catalina Medical Center"},\n       beats:[',
    shell_content,
    count=1
)

# Write updated story-shell.html
with open(shell_path, 'w') as f:
    f.write(shell_content)

print("✓ story-shell.html: HLS personas added")
print("✓ Dr. Sarah Chen renamed to Dr. Sarah Reyes (provider vertical only)")
