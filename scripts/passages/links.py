# Builds data/passages.json: for every passage named in relations.json, where to read it online.
# Most point at the section of the translation the passage was checked against, on ToposText
# ("2#1.110" = https://topostext.org/work/2#1.110); the Epic Cycle points at Theoi.
#   TEXTS=<dir> python3 scripts/passages/links.py      (the same <dir> as match.py)
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from find import sections
REPO = os.path.dirname(os.path.dirname(HERE))
EPIC = 'https://www.theoi.com/Text/EpicCycle.html'
TITLES = {}
for line in open(f'{HERE}/works.txt', encoding='utf8'):
    m = re.match(r'(\d+) (.*?) \(', line)
    if m: TITLES.setdefault(m.group(2), m.group(1))
FIXED = {'Iliad': '2', 'Odyssey': '3', 'Theogony': '4', 'Works and Days': '5', 'Shield of Heracles': '6', 'Apollodorus': '150', 'Apollodorus, Epitome': '837',
         'Pausanias': '213', 'Hyginus, Fabulae': '206', 'Hyginus, Astronomica': '207', 'Ovid, Metamorphoses': '141', 'Ovid, Fasti': '143', 'Ovid, Tristia': '663',
         'Pindar, Olympian': '18', 'Pindar, Pythian': '19', 'Pindar, Nemean': '20', 'Pindar, Isthmian': '21', 'Homeric Hymn': '386', 'Homeric Hymn to Heracles': '368'}
HES = {'Catalogue of Women': 'CW', 'Great Eoiae': 'GE', 'Astronomy': 'AS'}
SECS = {}
def ids(w):
    if w not in SECS: SECS[w] = [s for s, _ in sections(w)]
    return SECS[w]
def nums(s): return [int(x) for x in s.split('.')] if re.fullmatch(r'\d+(\.\d+)*', s) else None
def within(w, ref, prefix=''):
    """the section of work w that holds ref ("1.113"): the last one starting at or before it, in the same book"""
    want = nums(ref); best = None
    for s in ids(w):
        raw = s[len(prefix):] if s.startswith(prefix) else None
        n = nums(raw) if raw is not None else None
        if not n or not want: continue
        if len(n) == len(want) and n[:-1] == want[:-1] and n[-1] <= want[-1]: best = s
        elif len(n) > len(want) and n[:len(want)] == want and best is None: best = s      # "2.8" -> "2.8.1", "14" -> "14.3"
    return best
def link(piece, prev):
    piece = piece.strip()
    m = re.search(r'\(?in (Pausanias|Apollodorus|Athenaeus) ([\d.]+)', piece)
    if m and m.group(1) != 'Athenaeus':
        w = FIXED[m.group(1)]; s = within(w, m.group(2)); return f'{w}#{s}' if s else w
    if re.match(r'(Cypria|Aethiopis|Little Iliad|Sack of Ilium|Thebaid)', piece): return EPIC
    m = re.match(r'(.+?) fr\. (\d+) \(Evelyn-White\)', piece)
    if m and m.group(1) in HES:
        s = next((x for x in ids('7') if re.fullmatch(rf'{HES[m.group(1)]}\.F{m.group(2)}(\..*)?', x)), None); return f'7#{s}' if s else '7'
    if piece.endswith(', preface'): return FIXED.get(piece[:-9])
    m = re.match(r'(.*?)[ ]?(\d[\d.]*)(?:[–\-]\d[\d.]*)?(?: ff\.)?$', piece)
    if not m: return TITLES.get(piece) or FIXED.get(piece)
    title, ref = m.group(1).strip(), m.group(2)
    if not title: title = prev                       # "Epitome 5.23; 6.23": the second inherits the work
    w = FIXED.get(title) or TITLES.get(title)
    if not w: return None
    s = within(w, ref, 'e.' if w == '837' else '')
    return (f'{w}#{s}' if s else w), title
out = {}; missing = []
for r in json.load(open(f'{REPO}/data/relations.json')):
    for c in (r.get('cite') or {}).values():
        prev = None
        for piece in c.split('; '):
            got = link(piece, prev)
            if isinstance(got, tuple): got, prev = got
            if got: out[piece] = got
            else: missing.append(piece)
json.dump(dict(sorted(out.items())), open(f'{REPO}/data/passages.json', 'w'), ensure_ascii=False, indent=0)
print(len(out), 'passages linked;', len(set(missing)), 'without a link:', sorted(set(missing))[:40])
print('to the work only:', [k for k, v in out.items() if '#' not in v and not v.startswith('http')][:30])
