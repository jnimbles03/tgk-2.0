#!/usr/bin/env python3
"""Apply approved HLS family persona fixes - version 2"""

import re

shell_path = '/sessions/intelligent-admiring-cannon/mnt/TGK 2.0/stories/_shared/story-shell.html'

with open(shell_path, 'r') as f:
    shell_content = f.read()

# Test: just apply Chen -> Reyes rename first
shell_content = shell_content.replace('Dr. Sarah Chen', 'Dr. Sarah Reyes')

# Count matches for verification
count_reyes = shell_content.count('Dr. Sarah Reyes')
count_chen = shell_content.count('Dr. Sarah Chen')

with open(shell_path, 'w') as f:
    f.write(shell_content)

print(f"✓ Dr. Sarah Reyes: {count_reyes} occurrences")
print(f"✓ Dr. Sarah Chen remaining: {count_chen} occurrences")
