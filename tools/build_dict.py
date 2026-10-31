# Збирає словники для Wordle: розгортає hunspell (LibreOffice) + частотний список.
import re, sys, gzip, json, collections
BASE='/tmp/claude-0/-home-claude/74f3ab55-3cea-5069-8191-9000edb13a64/scratchpad/dl/'
CFG={
 'uk':dict(dic=BASE+'lo/uk_UA/uk_UA.dic',aff=BASE+'lo/uk_UA/uk_UA.aff',freq=BASE+'fw/content/2018/uk/uk_50k.txt',alpha='абвгґдеєжзийіїклмнопрстуфхцчшщьюя'),
 'ru':dict(dic=BASE+'lo/ru_RU/ru_RU.dic',aff=BASE+'lo/ru_RU/ru_RU.aff',freq=BASE+'fw/content/2018/ru/ru_50k.txt',alpha='абвгдежзийклмнопрстуфхцчшщъыьэюя'),
}
def parse_aff(p):
    sfx=collections.defaultdict(list); pfx=collections.defaultdict(list)
    for ln in open(p,encoding='utf-8'):
        t=ln.split()
        if len(t)>=5 and t[0] in('SFX','PFX'):
            f,strip,add,cond=t[1],t[2],t[3],t[4]
            if strip=='0':strip=''
            add=add.split('/')[0]
            if add=='0':add=''
            try: rx=re.compile((cond+'$') if t[0]=='SFX' else ('^'+cond)) if cond!='.' else None
            except re.error: continue
            (sfx if t[0]=='SFX' else pfx)[f].append((strip,add,rx))
    return sfx,pfx
def expand(w,flags,sfx,pfx):
    out={w}
    for f in flags:
        for strip,add,rx in sfx.get(f,()):
            if rx and not rx.search(w): continue
            if strip and not w.endswith(strip): continue
            out.add((w[:len(w)-len(strip)] if strip else w)+add)
        for strip,add,rx in pfx.get(f,()):
            if rx and not rx.search(w): continue
            if strip and not w.startswith(strip): continue
            out.add(add+(w[len(strip):] if strip else w))
    return out
for lg,c in CFG.items():
    ok=re.compile('^['+c['alpha']+']{5,8}$')
    norm=(lambda s:s.replace('ё','е')) if lg=='ru' else (lambda s:s)
    sfx,pfx=parse_aff(c['aff'])
    allw=set(); lemmas=set()
    for i,ln in enumerate(open(c['dic'],encoding='utf-8')):
        ln=ln.strip()
        if i==0 or not ln or ln[0]=='+': continue
        w,_,fl=ln.partition('/')
        if not w or w[0].isupper(): continue   # імена власні
        w=w.lower()
        for x in expand(w,fl,sfx,pfx):
            x=norm(x)
            if ok.match(x): allw.add(x)
        x=norm(w)
        if ok.match(x): lemmas.add(x)
    freq=[]
    for ln in open(c['freq'],encoding='utf-8'):
        t=ln.split()
        if t and ok.match(norm(t[0])): freq.append(norm(t[0]))
    top=[w for w in freq[:40000] if w in lemmas]
    ans=set(top)
    print(lg,'forms',len(allw),'lemmas',len(lemmas),'freqtop',len(top))
    bylen=collections.Counter(len(w) for w in allw); print(' all',dict(sorted(bylen.items())))
    print(' ans',dict(sorted(collections.Counter(len(w) for w in ans).items())))
    # зберігаємо: слова по довжині, відсортовані
    with gzip.open('/home/claude/gft-repo/dict/words_%s.txt.gz'%lg,'wt',encoding='utf-8',compresslevel=9) as f:
        f.write('\n'.join(sorted(allw)))
    # відповіді у порядку частотності
    seen=set(); ordered=[]
    for w in top:
        if w not in seen: seen.add(w); ordered.append(w)
    with gzip.open('/home/claude/gft-repo/dict/answers_%s.txt.gz'%lg,'wt',encoding='utf-8',compresslevel=9) as f:
        f.write('\n'.join(ordered))
