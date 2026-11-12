# usage: python3 -I find.py <work> <regex> [<regex> ...]   prints sections of a ToposText work matching all regexes
import re, sys, html, os
d = os.path.join(os.environ.get('TEXTS', '/tmp/ichor-texts'), 'texts')
def sections(w):
    t = open(os.path.join(d, f'w{w}.html'), encoding='utf8', errors='replace').read()
    parts = re.split(r'<b>&sect;\s*([^<]+)</b>', t)
    out = []
    for i in range(1, len(parts) - 1, 2):
        body = html.unescape(re.sub(r'<[^>]+>', '', parts[i + 1].split('<div class="pSelector"')[0]))
        out.append((parts[i].strip(), re.sub(r'\s+', ' ', body).strip()))
    return out
if __name__ == '__main__':
    w, pats = sys.argv[1], sys.argv[2:]
    width = int(os.environ.get('W', '160'))
    for sec, body in sections(w):
        if all(re.search(p, body, re.I) for p in pats):
            m = re.search(pats[0], body, re.I)
            print(f'[{sec}] …{body[max(0, m.start() - width):m.end() + width]}…')
