# Finds, for each relation and source group without a passage, a sentence in that group's texts that names both
# figures in a pattern of kinship ("X, son of Y", "Y begat X"), marriage or love, or with words of the deed in the
# relation's note. Writes candidates with the sentence found, for review: nothing goes into relations.json by itself.
# A candidate matched on a single word of the note, and any from Homer or the tragedians, is read before it is kept.
#   TEXTS=<dir> OUT=candidates.json python3 scripts/passages/match.py
# <dir>/texts/w<id>.html is the page of each work in works.txt, saved from https://topostext.org/work/<id>.
import json, re, sys, os, html, unicodedata, collections
HERE = os.path.dirname(os.path.abspath(__file__))
S = os.environ.get('TEXTS', '/tmp/ichor-texts')   # holds texts/w<id>.html, one page per work, from https://topostext.org/work/<id>
sys.path.insert(0, HERE)
from find import sections
REPO = os.path.dirname(os.path.dirname(HERE))
people = json.load(open(f'{REPO}/data/people.json')); relations = json.load(open(f'{REPO}/data/relations.json'))
P = {p['id']: p for p in people}

def norm(w):
    w = unicodedata.normalize('NFD', w.lower()); w = ''.join(c for c in w if not unicodedata.combining(c))
    w = re.sub(r"[’']s$", '', w)
    for a, b in [('ae', 'e'), ('oe', 'e'), ('ai', 'e'), ('oi', 'e'), ('ei', 'i'), ('ou', 'u'), ('k', 'c'), ('y', 'i')]: w = w.replace(a, b)
    w = re.sub(r'os$', 'us', w); w = re.sub(r'es$', 'e', w) if len(w) > 6 else w
    return w
ALIAS = {
 'zeus': 'Jove Jupiter', 'hera': 'Juno', 'poseidon': 'Neptune', 'hades': 'Dis Pluton Aidoneus Orcus', 'athena': 'Athene Minerva Pallas',
 'apollo': 'Phoebus', 'artemis': 'Diana', 'aphrodite': 'Venus Cypris Cytherea', 'ares': 'Mars', 'hermes': 'Mercury', 'hephaestus': 'Vulcan',
 'demeter': 'Ceres Deo', 'persephone': 'Proserpine Proserpina Core', 'dionysus': 'Bacchus Liber Bromius', 'cronus': 'Saturn', 'rhea': 'Ops',
 'gaia': 'Earth Ge Terra Gaea', 'uranus': 'Sky Heaven Caelus Coelus', 'nyx': 'Night', 'helios': 'Sun Sol', 'selene': 'Moon Luna', 'eos': 'Dawn Aurora',
 'leto': 'Latona', 'heracles': 'Hercules', 'odysseus': 'Ulysses', 'polydeuces': 'Pollux', 'oceanus': 'Ocean', 'erinyes': 'Furies Eumenides Erinys Fury',
 'moirai': 'Fates Parcae Moerae', 'charites': 'Graces', 'horae': 'Seasons Hours', 'thanatos': 'Death', 'hypnos': 'Sleep', 'eris': 'Strife Discord', 'pontus': 'Sea',
 'ajax': 'Aias', 'clytemnestra': 'Clytaemestra', 'pleisthenes': 'Plisthenes', 'alcmene': 'Alcmena Alcumena', 'hecuba': 'Hecabe', 'paris': 'Alexander',
 'neoptolemus': 'Pyrrhus', 'jocasta': 'Epicaste Iocaste Iocasta', 'ganymede': 'Ganymedes', 'iphigenia': 'Iphimede Iphianassa', 'hebe': 'Juventas', 'hestia': 'Vesta',
 'mnemosyne': 'Memory', 'nereids': 'Nereides Nereid', 'oceanids': 'Oceanides Oceanid', 'pleiades': 'Pleiads Pleiad', 'gorgons': 'Gorgon', 'graeae': 'Graiae Phorcides',
 'harpies': 'Harpy Harpyiae', 'sirens': 'Siren', 'cyclopes': 'Cyclops', 'hundred-handed': 'Hundred-handed Hecatoncheires Briareus Cottus Gyes Gyges',
 'danaids': 'Danaides Danaids', 'maenads': 'Bacchae Bacchants Bacchanals Maenad', 'suitors': 'suitors wooers', 'companions': 'comrades companions',
 'muses': 'Muse', 'medusa': 'Gorgon', 'minotaur': 'Minotaurus', 'pluto': 'Plouto Pluto', 'aeetes': 'Aeeta', 'tyro': '', 'semele': 'Thyone', 'ino': 'Leucothea',
 'helen': 'Helena', 'asclepius': 'Aesculapius', 'pasiphae': '', 'ariadne': 'Ariadna', 'europa': 'Europe', 'io': '', 'danae': '', 'andromache': '',
 'hippolyta': 'Hippolyte', 'penthesilea': 'Penthesileia', 'atalanta': 'Atalante', 'eriphyle': 'Eriphyla', 'polynices': 'Polyneices', 'cassiopeia': 'Cassiepea Cassiope',
 'sea-monster': 'monster', 'nemean-lion': 'lion', 'hydra': 'Hydra', 'sphinx': 'Sphinx', 'chimera': 'Chimaera', 'hippodamia': 'Hippodameia', 'priam': '', 'laius': 'Laios',
}
def names(id):
    p = P[id]; out = set()
    n = re.sub(r'\(.*?\)', '', p['name']).strip()
    first = n.split()[0] if not n.lower().startswith(('the ', 'sons ', 'suitors', 'companions', 'bandits')) else None
    if first: out.add(norm(first))
    for a in ALIAS.get(id, '').split(): out.add(norm(a))
    return out
PHRASE = {'sons-of-aegyptus': ['sons of egiptus', 'sons of egyptus'], 'danaids': ['daughters of danaus'], 'sons-of-megara': ['megara', 'children'], 'bandits': ['sinis', 'sciron', 'procruste', 'periphete', 'cercyon'],
          'oceanids': ['daughters of ocean'], 'nereids': ['daughters of nereus'], 'pleiades': ['daughters of atlas']}

WORKS = {'E': ['2', '3'] + [str(i) for i in range(354, 387)], 'H': ['4', '7', '5', '6'],
         'T': [str(i) for i in list(range(9, 16)) + list(range(18, 22)) + list(range(25, 32)) + list(range(33, 52)) if os.path.exists(f'{S}/texts/w{i}.html')],
         'A': ['150', '837'], 'L': ['206', '213', '141', '207', '143']}
TITLES = {}
for line in open(f'{HERE}/works.txt', encoding='utf8'):
    m = re.match(r"(\d+) (.*?) \(", line)
    if m: TITLES[m.group(1)] = m.group(2)
HES = {'CW': 'Catalogue of Women', 'GE': 'Great Eoiae', 'AS': 'Astronomy', 'MC': 'Marriage of Ceyx', 'MS': 'Melampodia', 'GW': 'Great Works', 'ID': 'Idaean Dactyls', 'PC': 'Precepts of Chiron'}
def label(w, sec, nxt):
    num = lambda s: re.fullmatch(r'\d+', s)
    def rng(a, b, step):   # a..b-1 within the same book, else a..a+step
        pa, pb = a.split('.'), (b or '').split('.')
        if not all(num(x) for x in pa): return None
        la = int(pa[-1]); lb = int(pb[-1]) - 1 if b and len(pb) == len(pa) and pb[:-1] == pa[:-1] and all(num(x) for x in pb) and int(pb[-1]) > la else (la + step if step else None)
        head = '.'.join(pa[:-1]); head = head + '.' if head else ''
        return f'{head}{la}–{lb}' if lb and lb > la else f'{head}{la}' + ('' if lb else ' ff.')
    if w == '2': r = rng(sec, nxt, 4); return r and f'Iliad {r}'
    if w == '3': r = rng(sec, nxt, 4); return r and f'Odyssey {r}'
    if w in ('4', '5', '6'): r = rng(sec, nxt, 0); return r and f"{ {'4': 'Theogony', '5': 'Works and Days', '6': 'Shield of Heracles'}[w]} {r}"
    if w == '7':
        m = re.match(r'([A-Z]+)\.F(\d+)', sec); return m and m.group(1) in HES and f'{HES[m.group(1)]} fr. {m.group(2)} (Evelyn-White)'
    if 354 <= int(w) <= 386: r = rng(sec, nxt, 0); return r and f"{re.sub(r' ?[0-9]+$', '', TITLES[w])} {r}"
    if 18 <= int(w) <= 21: r = rng(sec, nxt, 24); return r and f"Pindar, {TITLES[w].split(', ')[1].replace(' Odes', '')} {r}"
    if w == '150': return f'Apollodorus {sec}'
    if w == '837': return f'Apollodorus, Epitome {sec[2:]}' if sec.startswith('e.') else None
    if w == '213': return f'Pausanias {sec}'
    if w == '206': return 'Hyginus, Fabulae ' + sec.split('.')[0] if not sec.startswith('0') else None
    if w == '207': return 'Hyginus, Astronomica ' + '.'.join(sec.split('.')[:2])
    if w == '141': r = rng(sec, nxt, 0); return r and f'Ovid, Metamorphoses {r}'
    if w == '143': r = rng(sec, nxt, 0); return r and f'Ovid, Fasti {r}'
    r = rng(sec, nxt, 0); t = TITLES[w]
    return r and f"{t} {r}"

KW = {'parent': r'\b(sons?|daughters?|child|children|bore|bare|born|begat|begot|begotten|father|mother|offspring|sired|birth|sprung|seed|fathered|parents?)\b',
      'marriage': r'\b(married|marry|marries|wife|wed|wedded|husband|bride|spouse|marriage|consort|wives)\b',
      'affair': r'\b(loved?|lay|lain|bed|intercourse|ravish\w*|seduc\w*|carried off|embrac\w*|union|mistress|desire|passion|debauch\w*|violat\w*|raped?|abduct\w*|consort\w*|concubine|paramour|mingled)\b'}
GEN = r'\b(kill\w*|slew|slain|slay\w*|murder\w*|punish\w*|curs\w*|turn\w*|chang\w*|transform\w*|destroy\w*|shot|wound\w*|blind\w*|struck|death|died|war|fought|avenge\w*|wrath|anger|angry)\b'
STOP = set('with from that this they them their into after when were have been being which while over upon then than also only between both against would could took made gave came went sent himself herself'.split())
def stems(note, skip):
    return {norm(w)[:5] for w in re.findall(r"[A-Za-z’']+", note or '') if len(w) >= 4 and w.lower() not in STOP and norm(w) not in skip}

SENT = {}
def sentences(w):
    if w not in SENT:
        out = []; secs = sections(w)
        for i, (sec, body) in enumerate(secs):
            body = re.sub(r'Event Date:.*$', '', body)
            lab = label(w, sec, secs[i + 1][0] if i + 1 < len(secs) else None)
            if not lab: continue
            for s in re.split(r'(?<=[.;!?])\s+', body):
                if len(s) < 12: continue
                raw = re.findall(r"[A-Za-zÀ-ž’']+", s)
                # a name is a capitalised word (not merely the first word of the sentence, for names that are also common words)
                toks = [norm(t) for t in raw]; caps = [t[0].isupper() for t in raw]
                out.append((lab, s, toks, {t for i, t in enumerate(toks) if caps[i]}, ' '.join(toks), caps))
        SENT[w] = out
    return SENT[w]
def has(id, tokset, joined):
    return bool(names(id) & tokset) or any(ph in joined for ph in PHRASE.get(id, []))
COMMON = {norm(x) for x in 'Earth Sky Heaven Sea Night Sun Moon Dawn Death Sleep Strife Discord Memory Ocean lion monster Seasons Hours Graces Fates suitors wooers comrades companions Gorgon Muse Fury Furies'.split()}
def pos(id, toks, caps):
    ns = names(id)
    return [i for i, t in enumerate(toks) if t in ns and caps[i] and not (i == 0 and t in COMMON)]
BEGET = r'begat|begot|begotten|bare|bore|born|bear|fathered|sired'
def strict(typ, toks, ia, ib, note_stems, joined):
    # ia: positions of the first figure (parent, husband, lover, doer), ib: of the second
    w = lambda i, j: ' '.join(toks[max(0, i):max(0, j)])
    for x in ia:
        for y in ib:
            lo, hi = min(x, y), max(x, y); between = w(lo + 1, hi)
            if typ == 'parent':
                if y < x and x - y <= 14 and re.search(r'\b(sons?|daughters?|child|children|offspring) of\b', between): return 'child-of'
                if y < x and x - y <= 14 and re.search(r'\b(whom|who)\b.*\b(%s)\b' % BEGET, between + ' ' + w(x + 1, x + 6)): return 'whom-bore'
                if x < y and y - x <= 22 and re.search(r'\b(%s|father of|mother of|gave birth|had (a |an |two |three |four |five |six |seven |twin |mani )?(sons?|daughters?|children|child|issue|offspring))\b' % BEGET, between) and not re.search(r'\b(sons?|daughters?) of\b', between): return 'begat'
                if y < x and x - y <= 10 and re.search(r'\b(%s)\b.*\b(to|by|of|unto)$' % BEGET, between): return 'bore-to'
                if y < x and x - y <= 12 and re.search(r'\bby$', between) and re.search(r'\b(%s|had|sons?|daughters?|children)\b' % BEGET, w(y - 8, x)): return 'by'
                if x < y and x <= 3 and toks[max(0, x - 1)] == 'bi' and y - x <= 16: return 'by-had'
            elif typ == 'marriage':
                if hi - lo <= 14 and re.search(r'\b(married|marri|marry|wife|wed|wedded|husband|bride|spouse|marriage|consort)\b', w(lo - 4, hi + 5)): return 'married'
            elif typ == 'affair':
                if hi - lo <= 14 and re.search(r'\b(loved?|lay|lain|bed|intercurse|ravish\w*|seduc\w*|carried|embrac\w*|union|mistress|desire|passion|debauch\w*|violat\w*|raped?|abduct\w*|concubine|paramur|mingled|enamured|carri)\b', w(lo - 5, hi + 6)): return 'loved'
            else:
                near = w(lo - 8, hi + 9)
                n = len({st for st in note_stems if st in near})
                if hi - lo <= 25 and n >= 1: return f'deed{n}'
    return None

if os.environ.get('LOOSE'):

    # LOOSE=1: a wider net for what the strict patterns miss. Both figures in one section, close to each other, with a word
    # of kinship (or of the deed) near them. Every find of this kind must be read before it is kept.
    SECS = {}
    def secs(w):
        if w not in SECS:
            out = []; ss = sections(w)
            for i, (sec, body) in enumerate(ss):
                body = re.sub(r'Event Date:.*$', '', body)
                lab = label(w, sec, ss[i + 1][0] if i + 1 < len(ss) else None)
                if not lab: continue
                raw = re.findall(r"[A-Za-zÀ-ž’']+", body)
                toks = [norm(x) for x in raw]; caps = [x[0].isupper() for x in raw]
                out.append((lab, raw, toks, caps, {x for k, x in enumerate(toks) if caps[k]}))
            SECS[w] = out
        return SECS[w]
    KIN = re.compile(r'^(sons?|daughters?|child|children|offspring|begat|begot|begotten|bare|bore|born|father|mother|fathered|birth|parents?)$')
    WED = re.compile(r'^(married|marri|marry|wife|wed|wedded|husband|bride|spouse|marriage|consort|wedlock)$')
    LOVE = re.compile(r'^(loved?|lay|lain|bed|bedded|intercurse|ravish\w*|seduc\w*|embrac\w*|union|desire|passion|raped?|abduct\w*|enamured|carri\w*)$')
    out = []
    for ri, r in enumerate(relations):
        a, b = r['from'], r['to']; note_stems = stems(r.get('note'), names(a) | names(b))
        for g in r['sources']:
            if g in r.get('cite', {}): continue
            best = None
            for wi, w in enumerate(WORKS[g]):
                for lab, raw, toks, caps, capset in secs(w):
                    if not (names(a) & capset and names(b) & capset): continue
                    ia, ib = pos(a, toks, caps), pos(b, toks, caps)
                    if not ia or not ib: continue
                    d, x, y = min((abs(x - y), x, y) for x in ia for y in ib)
                    if d > 45: continue
                    lo, hi = max(0, min(x, y) - 10), max(x, y) + 12
                    near = toks[lo:hi]
                    if r['type'] == 'parent': k = sum(1 for t in near if KIN.match(t))
                    elif r['type'] == 'marriage': k = sum(1 for t in near if WED.match(t))
                    elif r['type'] == 'affair': k = sum(1 for t in near if LOVE.match(t))
                    else: k = len({st for st in note_stems if any(t.startswith(st) for t in toks[max(0, lo - 25):hi + 25])})
                    if not k: continue
                    score = min(k, 3) - d / 12 - wi * 0.3
                    if not best or score > best[0]: best = (score, lab, ' '.join(raw[lo:hi]))
            if best: out.append({'i': ri, 'type': r['type'], 'from': a, 'to': b, 'g': g, 'cite': best[1], 'score': round(best[0], 2), 'how': 'loose', 'note': r.get('note', ''), 'text': best[2]})
    json.dump(out, open(os.environ.get('OUT', 'candidates.json'), 'w'), ensure_ascii=False, indent=0)
    print(len(out), 'loose candidates')
    sys.exit()

out = []; stats = collections.Counter()
for ri, r in enumerate(relations):
    a, b = r['from'], r['to']; na, nb = names(a) | set(), names(b)
    note_stems = stems(r.get('note'), na | nb)
    for g in r['sources']:
        if g in r.get('cite', {}): continue
        best = None
        for wi, w in enumerate(WORKS[g]):
            for lab, s, toks, tokset, joined, caps in sentences(w):
                if not (has(a, tokset, joined) and has(b, tokset, joined)): continue
                if g == 'T' and re.search(r'\b(enters?|Enter|exits?|Exit|EXITS?|ENTERS?|Scene|SCENE)\b', s): continue
                ia, ib = pos(a, toks, caps), pos(b, toks, caps)
                if not ia or not ib: continue
                how = strict(r['type'], toks, ia, ib, note_stems, joined)
                if not how: continue
                dist = min(abs(x - y) for x in ia for y in ib)
                score = (int(how[4:]) * 3 if how.startswith('deed') else 2) - dist / 10 - wi * 0.2 - len(s) / 600
                if not best or score > best[0]: best = (score, lab, s, dist, how, 0, 0)
        stats[(g, bool(best))] += 1
        if best: out.append({'i': ri, 'type': r['type'], 'from': a, 'to': b, 'g': g, 'cite': best[1], 'score': round(best[0], 2), 'how': best[4], 'note': r.get('note', ''), 'text': best[2]})
json.dump(out, open(os.environ.get('OUT', 'candidates.json'), 'w'), ensure_ascii=False, indent=0)
print(sorted(stats.items())); print(len(out), 'candidates')
