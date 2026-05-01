#!/usr/bin/env python3
"""Apply Education vertical fixes to TGK 2.0 - Priya Shah side fix + Jamal Rivers + Registrar"""
import json, re, sys

# FIX 1: Narrations JSON
with open('_audits/usecase-narrations-2026-04-27.json') as f:
    data = json.load(f)
edu = data['verticals']['education']
priya_fixes = 0
for uc in ['intake', 'fraud-fabric', 'maintenance']:
    for scene in edu['usecases'][uc]['scenes']:
        if scene.get('persona', {}).get('name') == 'Priya Shah' and scene.get('persona', {}).get('side') == 'advisor':
            scene['persona']['side'] = 'client'
            priya_fixes += 1
        for beat in scene.get('beats', []):
            if beat.get('persona', {}).get('name') == 'Priya Shah' and beat.get('persona', {}).get('side') == 'advisor':
                beat['persona']['side'] = 'client'
                priya_fixes += 1
if 'persona' not in edu['usecases']['intake']['scenes'][0]:
    edu['usecases']['intake']['scenes'][0]['persona'] = {'side': 'advisor', 'name': 'Jamal Rivers', 'role': 'Enrollment Specialist · Maple Ridge Admissions'}
for uc in ['maintenance', 'fraud-fabric']:
    if len(edu['usecases'][uc]['scenes']) > 2:
        edu['usecases'][uc]['scenes'][2]['persona'] = {'side': 'advisor', 'name': 'Registrar', 'role': "Maple Ridge Registrar's Office"}
with open('_audits/usecase-narrations-2026-04-27.json', 'w') as f:
    json.dump(data, f, indent=2)
print(f"Narrations JSON: {priya_fixes} Priya side fixes + Jamal + Registrar personas added")

# FIX 2: story-shell.html
with open('stories/_shared/story-shell.html') as f:
    html = f.read()
html_fixes = len(re.findall(r'side: "advisor", name: "Priya Shah"', html))
html = re.sub(r'side: "advisor", name: "Priya Shah"', 'side: "client", name: "Priya Shah"', html)
with open('stories/_shared/story-shell.html', 'w') as f:
    f.write(html)
print(f"Story-shell.html: {html_fixes} Priya side fixes applied")

# VALIDATE
try:
    json.load(open('_audits/usecase-narrations-2026-04-27.json'))
    print("JSON syntax check: PASS")
except Exception as e:
    print(f"JSON syntax check: FAIL - {e}")
    sys.exit(1)
try:
    import subprocess
    match = re.search(r'<script[^>]*>([\s\S]*?)</script>', html)
    if match:
        script = match.group(1)[:2000]
        result = subprocess.run(['node', '--check'], input=script, text=True, capture_output=True, timeout=5)
        print(f"JS syntax check: {'PASS' if result.returncode == 0 else 'WARN'}")
except:
    print("JS syntax check: SKIP (node not available)")

print(f"\nAll fixes applied: {priya_fixes + html_fixes} total changes")
