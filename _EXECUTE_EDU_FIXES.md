# Execute Education Vertical Fixes

Run this Python script in the TGK 2.0 directory:

```bash
cd /Users/patrickmeyer/Documents/Claude/Projects/TGK\ 2.0
python3 fix_education_vertical.py
bash _audits/_persona_audit_build.sh
```

This will:
1. Fix narrations JSON - Priya Shah advisor→client (all flows), add Jamal Rivers to intake/S1, add Registrar personas
2. Fix story-shell.html - Priya Shah advisor→client
3. Validate JSON syntax
4. Check JS syntax
5. Run persona audit to verify education flows
