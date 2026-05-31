"""
Extract extended group manifest from fgb .group files.
Uses the 'definition' field (HTML) from each file — strip tags to get the
compact user-friendly presentation that DefiningRelations.parseFormattedPresentation
already understands (e.g. 'a,b:a11=b2=baba=1').
Output: JS array literal suitable for pasting into AutoUpgrade.js.
"""

import json, glob, re, sys


def strip_definition(html_def):
    text = re.sub(r'<[^>]+>', '', html_def)   # remove HTML tags
    text = text.replace('⟨', '').replace('⟩', '')
    text = re.sub(r'\s*,\s*', ',', text)       # remove spaces around commas
    text = re.sub(r'\s*:\s*', ':', text)       # remove spaces around colon
    return text.strip()


# ── Main ───────────────────────────────────────────────────────────────

files = sorted(glob.glob('/mnt/nvme/GE3-Data/claude-group-explorer/groups/[0-9]*,[0-9]*.group'))
print(f'// {len(files)} extended groups', file=sys.stderr)

entries = []
for path in files:
    with open(path) as fh:
        d = json.load(fh)

    presentation = strip_definition(d['definition'])

    entry = {
        'presentation': presentation,
        'gapid':        d['gapid'],
        'gapname':      d['gapname'],
        'names':        d['names'],
    }
    if d.get('links'):
        entry['link'] = d['links'][0]
    if d.get('phrase'):
        entry['phrase'] = d['phrase']

    entries.append(entry)
    print(f'  {path.split("/")[-1]} → {presentation[:70]}', file=sys.stderr)

# Output JS array literal
print('const EXTENDED_MANIFEST = [')
for i, e in enumerate(entries):
    comma = ',' if i < len(entries) - 1 else ''
    print('   ' + json.dumps(e, ensure_ascii=False) + comma)
print(']')
