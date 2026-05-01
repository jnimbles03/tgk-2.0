#!/usr/bin/env python3
"""
Apply approved Education vertical fixes to TGK 2.0 data:
1. Flip Priya Shah side from advisor to client
2. Add Jamal Rivers as advisor persona where appropriate
3. Add institutional advisors (Registrar) in relevant scenes
"""

import json
import re

def fix_narrations_json():
    """Fix the usecase-narrations JSON file."""
    print("=== FIXING NARRATIONS JSON ===")
    with open('/Users/patrickmeyer/Documents/Claude/Projects/TGK 2.0/_audits/usecase-narrations-2026-04-27.json', 'r') as f:
        data = json.load(f)

    edu = data['verticals']['education']
    usecases = ['intake', 'fraud-fabric', 'maintenance']

    changes = []

    for uc in usecases:
        scenes = edu['usecases'][uc]['scenes']

        for scene_idx, scene in enumerate(scenes):
            # Fix Priya Shah's side from advisor to client at scene level
            if 'persona' in scene and scene['persona'].get('name') == 'Priya Shah':
                old_side = scene['persona'].get('side')
                if old_side == 'advisor':
                    scene['persona']['side'] = 'client'
                    changes.append(f"{uc}/scene{scene_idx}: Priya Shah side={old_side}→client")

            # Fix beats
            if 'beats' in scene:
                for beat_idx, beat in enumerate(scene['beats']):
                    if 'persona' in beat and beat['persona'].get('name') == 'Priya Shah':
                        old_side = beat['persona'].get('side')
                        if old_side == 'advisor':
                            beat['persona']['side'] = 'client'
                            changes.append(f"{uc}/scene{scene_idx}/beat{beat_idx}: Priya Shah side={old_side}→client")

    # Add Jamal Rivers to intake/SCENE 1 as advisor persona
    if 'persona' not in edu['usecases']['intake']['scenes'][0]:
        edu['usecases']['intake']['scenes'][0]['persona'] = {
            "side": "advisor",
            "name": "Jamal Rivers",
            "role": "Enrollment Specialist · Maple Ridge Admissions"
        }
        changes.append("intake/scene0: Added Jamal Rivers persona")

    # Replace Priya with Jamal in default/SCENE 4 (Data) - but default isn't in narrations
    # So only handle maintenance and fraud-fabric scene 3 (Registrar)

    # For maintenance/SCENE 3, add Registrar if scene exists
    if len(edu['usecases']['maintenance']['scenes']) > 2:
        maint_scene3 = edu['usecases']['maintenance']['scenes'][2]
        maint_persona = maint_scene3.get('persona', {})
        if maint_persona.get('name') != 'Registrar':
            maint_scene3['persona'] = {
                "side": "advisor",
                "name": "Registrar",
                "role": "Maple Ridge Registrar's Office"
            }
            changes.append("maintenance/scene2: Set Registrar persona")

    # For fraud-fabric/SCENE 3 (Chain of Custody), add Registrar if scene exists
    if len(edu['usecases']['fraud-fabric']['scenes']) > 2:
        ff_scene3 = edu['usecases']['fraud-fabric']['scenes'][2]
        ff_persona = ff_scene3.get('persona', {})
        if ff_persona.get('name') != 'Registrar':
            ff_scene3['persona'] = {
                "side": "advisor",
                "name": "Registrar",
                "role": "Maple Ridge Registrar's Office"
            }
            changes.append("fraud-fabric/scene2: Set Registrar persona")

    # Save
    with open('/Users/patrickmeyer/Documents/Claude/Projects/TGK 2.0/_audits/usecase-narrations-2026-04-27.json', 'w') as f:
        json.dump(data, f, indent=2)

    print(f"Applied {len(changes)} changes to narrations JSON")
    for change in changes:
        print(f"  {change}")

    return len(changes)

def fix_story_shell():
    """Fix the story-shell.html VERTICALS object."""
    print("\n=== FIXING STORY-SHELL.HTML ===")
    with open('/Users/patrickmeyer/Documents/Claude/Projects/TGK 2.0/stories/_shared/story-shell.html', 'r') as f:
        html = f.read()

    changes = []

    # Pattern: Priya Shah with side:"advisor" → change to side:"client"
    # Look for persona objects with Priya Shah and advisor side
    pattern = r'(persona:\s*\{\s*side:\s*")[advisor"]+("[^}]*name:\s*")[Priya Shah]+("[^}]*\})'

    def fix_priya_side(match):
        full = match.group(0)
        if 'side: "advisor"' in full and 'Priya Shah' in full:
            fixed = full.replace('side: "advisor"', 'side: "client"')
            changes.append("Fixed Priya Shah side to client")
            return fixed
        return full

    # More flexible approach: find each Priya Shah persona and check its side
    # Look for patterns like: persona: { side: "advisor", name: "Priya Shah", role: ...

    priya_pattern = r'persona:\s*\{\s*side:\s*"advisor",\s*name:\s*"Priya Shah"'
    html_new = re.sub(priya_pattern, 'persona: { side: "client", name: "Priya Shah"', html)

    if html_new != html:
        # Count replacements
        count = len(re.findall(priya_pattern, html))
        changes.append(f"Fixed {count} instances of Priya Shah advisor→client")

    # Add Jamal Rivers to Scene 1 if not present
    # Look for education's first scene and add Jamal persona if missing

    html = html_new

    with open('/Users/patrickmeyer/Documents/Claude/Projects/TGK 2.0/stories/_shared/story-shell.html', 'w') as f:
        f.write(html)

    print(f"Applied {len(changes)} changes to story-shell.html")
    for change in changes:
        print(f"  {change}")

    return len(changes)

if __name__ == '__main__':
    fix_narrations_json()
    fix_story_shell()
    print("\n=== CHANGES APPLIED ===")
