#!/usr/bin/env python3
import json
import re
import sys

# 1. Fix narrations JSON
print('=== FIXING NARRATIONS JSON ===')
with open('_audits/usecase-narrations-2026-04-27.json', 'r') as f:
    data = json.load(f)

edu = data['verticals']['education']
usecases = ['intake', 'fraud-fabric', 'maintenance']
changes_narr = []

for uc in usecases:
    scenes = edu['usecases'][uc]['scenes']
    for scene_idx, scene in enumerate(scenes):
        if 'persona' in scene and scene['persona'].get('name') == 'Priya Shah':
            if scene['persona'].get('side') == 'advisor':
                scene['persona']['side'] = 'client'
                changes_narr.append(f'{uc}/S{scene_idx}:Priya→client')
        if 'beats' in scene:
            for beat_idx, beat in enumerate(scene['beats']):
                if 'persona' in beat and beat['persona'].get('name') == 'Priya Shah':
                    if beat['persona'].get('side') == 'advisor':
                        beat['persona']['side'] = 'client'

# Add Jamal to intake/scene 0
if 'persona' not in edu['usecases']['intake']['scenes'][0]:
    edu['usecases']['intake']['scenes'][0]['persona'] = {
        'side': 'advisor', 'name': 'Jamal Rivers',
        'role': 'Enrollment Specialist · Maple Ridge Admissions'
    }
    changes_narr.append('intake/S0:+Jamal')

# Add Registrar to maintenance/scene 2
if len(edu['usecases']['maintenance']['scenes']) > 2:
    edu['usecases']['maintenance']['scenes'][2]['persona'] = {
        'side': 'advisor', 'name': 'Registrar',
        'role': 'Maple Ridge Registrar\'s Office'
    }
    changes_narr.append('maint/S2:+Registrar')

# Add Registrar to fraud-fabric/scene 2
if len(edu['usecases']['fraud-fabric']['scenes']) > 2:
    edu['usecases']['fraud-fabric']['scenes'][2]['persona'] = {
        'side': 'advisor', 'name': 'Registrar',
        'role': 'Maple Ridge Registrar\'s Office'
    }
    changes_narr.append('ff/S2:+Registrar')

with open('_audits/usecase-narrations-2026-04-27.json', 'w') as f:
    json.dump(data, f, indent=2)

print(f'Narrations: {len(changes_narr)} changes')

# 2. Fix story-shell.html
print('=== FIXING STORY-SHELL.HTML ===')
with open('stories/_shared/story-shell.html', 'r') as f:
    html = f.read()

# Fix Priya Shah advisor → client
before = html
html = re.sub(r'side: "advisor", name: "Priya Shah"', 'side: "client", name: "Priya Shah"', html)
fixes = len(re.findall(r'side: "client", name: "Priya Shah"', html))

with open('stories/_shared/story-shell.html', 'w') as f:
    f.write(html)

print(f'Story-shell: {fixes} Priya side fixes')
print(f'All changes applied: {len(changes_narr)} narrations + {fixes} shell fixes')

# Validate JSON
try:
    with open('_audits/usecase-narrations-2026-04-27.json', 'r') as f:
        json.load(f)
    print('JSON validation: PASS')
except Exception as e:
    print(f'JSON validation: FAIL - {e}')
    sys.exit(1)

# Validate JS in story-shell.html by running node check (if available)
import subprocess
try:
    # Extract first script block
    match = re.search(r'<script[^>]*>([\s\S]*?)</script>', html)
    if match:
        script_content = match.group(1)
        result = subprocess.run(['node', '--check'], input=script_content, text=True, capture_output=True, timeout=5)
        if result.returncode == 0:
            print('JS syntax check: PASS')
        else:
            print(f'JS syntax check: WARN - {result.stderr[:100]}')
except Exception as e:
    print(f'JS syntax check: SKIP ({type(e).__name__})')

print('Done.')
