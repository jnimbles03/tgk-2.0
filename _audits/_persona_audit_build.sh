#!/usr/bin/env bash
# Re-run all three persona/fiction audits and rebuild the inline HTML pages.
# Run from repo root:  bash _audits/_persona_audit_build.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# Pass 1 — persona × fiction (the original)
python3 _audits/_persona_fiction_extract.py

# Pass 2 + 3 — sequence-and-role audit + naming directory
python3 _audits/_persona_sequence_extract.py

# Pass 4 — decisions review (extracts from rewrite proposal docs)
if [ -f _audits/_extract_decisions.py ]; then
  python3 _audits/_extract_decisions.py
fi

# Bake the JSON inline into each template
python3 - << 'PY'
import json
def bake(template_path, data_path, out_path):
    template = open(template_path).read()
    data = json.dumps(json.load(open(data_path)), ensure_ascii=False)
    data_safe = data.replace('</script>', '<\\/script>')
    out = template.replace('__INLINE_JSON__', data_safe)
    open(out_path,'w').write(out)
    print(f"Wrote {out_path} ({len(out)} bytes)")

bake('_audits/_persona-fiction-audit.template.html',
     '_audits/persona-fiction-data.json',
     '_audits/persona-fiction-audit.html')

bake('_audits/_persona-sequence-audit.template.html',
     '_audits/persona-sequence-data.json',
     '_audits/persona-sequence-audit.html')

bake('_audits/_character-naming-audit.template.html',
     '_audits/character-naming-data.json',
     '_audits/character-naming-audit.html')

import os
if os.path.exists('_audits/decisions-2026-04-30.json'):
    bake('_audits/_decisions-review.template.html',
         '_audits/decisions-2026-04-30.json',
         '_audits/decisions-review.html')
PY

echo ""
echo "Open one of:"
echo "  _audits/persona-fiction-audit.html       (firm/document/workflow coherence)"
echo "  _audits/persona-sequence-audit.html      (sequence + role coherence)"
echo "  _audits/character-naming-audit.html      (every name in one place)"
echo "  _audits/decisions-review.html            (walk decisions one at a time)"
