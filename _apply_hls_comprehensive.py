#!/usr/bin/env python3
"""Comprehensive HLS family persona fixes"""

import json

shell_path = '/sessions/intelligent-admiring-cannon/mnt/TGK 2.0/stories/_shared/story-shell.html'

with open(shell_path, 'r') as f:
    lines = f.readlines()

# Create a new list with insertions
output = []
i = 0
while i < len(lines):
    line = lines[i]
    output.append(line)

    # Provider S1 persona - detect after Jordan Kim lede
    if 'Jordan Kim" opens Riverside Health' in line and 'beats:[' in lines[i+1]:
        output.append(lines[i+1])  # beats:[
        i += 1
        # Insert persona before beats
        output.insert(-1, '       persona:{side:"client", name:"Jordan Kim", role:"Patient · Riverside Health"},\n')
        continue

    # Provider S4 persona - detect SCENE 4 DATA for provider
    if 'SCENE 4 OF 5 · DATA" head:"The agreement repository lands the patient record in Riverside' in line:
        # Find the lede line and insert persona after
        j = i
        while j < min(i+5, len(lines)):
            if 'beats:[' in lines[j]:
                # Found beats, insert persona before it
                output.append(lines[j])
                output.insert(-1, '       persona:{side:"advisor", name:"Daniela Okafor", role:"Registrar · Riverside Health"},\n')
                i = j
                break
            else:
                output.append(lines[j])
                j += 1
        i += 1
        continue

    # Lifesciences S1 persona
    if 'Ethan Park, Clinical Study Manager at Helix, opens the site-activation webform' in line and 'beats:[' in lines[i+1]:
        output.append(lines[i+1])
        i += 1
        output.insert(-1, '       persona:{side:"advisor", name:"Ethan Park", role:"Clinical Study Manager · Helix"},\n')
        continue

    # Lifesciences S4 persona
    if 'SCENE 4 OF 5 · DATA" head:"The agreement repository extracts the site file into the study binder' in line:
        j = i
        while j < min(i+5, len(lines)):
            if 'beats:[' in lines[j]:
                output.append(lines[j])
                output.insert(-1, '       persona:{side:"advisor", name:"Ethan Park", role:"Clinical Study Manager · Helix"},\n')
                i = j
                break
            else:
                output.append(lines[j])
                j += 1
        i += 1
        continue

    # Payor S1 persona
    if 'Marcus Chen" compares plans on Unity Health Plan' in line and 'beats:[' in lines[i+1]:
        output.append(lines[i+1])
        i += 1
        output.insert(-1, '       persona:{side:"client", name:"Marcus Chen", role:"Member · Unity Health Plan"},\n')
        continue

    # Payor S4 persona
    if 'SCENE 4 OF 5 · DATA" head:"The agreement repository extracts Marcus' in line:
        j = i
        while j < min(i+5, len(lines)):
            if 'beats:[' in lines[j]:
                output.append(lines[j])
                output.insert(-1, '       persona:{side:"advisor", name:"Brenda Estevez", role:"Member Services Representative · Unity Health Plan"},\n')
                i = j
                break
            else:
                output.append(lines[j])
                j += 1
        i += 1
        continue

    # Provider-ROI S1 persona (and fix Renata Voss -> Renata López)
    if 'A records request for Eric Tan arrives from Silver Mountain' in line:
        # Fix name
        output[-1] = output[-1].replace('Renata Voss', 'Renata López')
        if 'beats:[' in lines[i+1]:
            output.append(lines[i+1])
            i += 1
            output.insert(-1, '       persona:{side:"advisor", name:"Renata López", role:"Health Information Manager · Catalina Medical Center"},\n')
        continue

    # Provider-ROI S4 persona
    if 'SCENE 4 OF 5 · DATA" head:"The agreement repository stages the records packet' in line:
        j = i
        while j < min(i+5, len(lines)):
            if 'beats:[' in lines[j]:
                output.append(lines[j])
                output.insert(-1, '       persona:{side:"advisor", name:"Renata López", role:"Health Information Manager · Catalina Medical Center"},\n')
                i = j
                break
            else:
                output.append(lines[j])
                j += 1
        i += 1
        continue

    # General rename: Dr. Sarah Chen -> Dr. Sarah Reyes (provider only)
    line = line.replace('Dr. Sarah Chen', 'Dr. Sarah Reyes')
    output[-1] = line

    i += 1

with open(shell_path, 'w') as f:
    f.writelines(output)

print("✓ All HLS personas added comprehensively")
print("✓ Dr. Sarah Chen renamed to Dr. Sarah Reyes")
print("✓ Renata Voss renamed to Renata López")
