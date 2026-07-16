"""Parse alfabank.ru dump in main_page.html into structured content."""
from __future__ import annotations

import json
import re
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "main_page.html").read_text(encoding="utf-8", errors="ignore")

# CDN / media urls
urls = sorted(set(re.findall(r"https://alfabank\.servicecdn\.ru/[^\"'\s)]+", html)))
urls += sorted(set(re.findall(r"https://alfabank\.ru/[^\"'\s)]+\.(?:jpg|jpeg|png|webp|svg)", html)))
# also background-image urls
bg = re.findall(r"background-image:\s*url\(&quot;([^&]+)&quot;\)", html)
bg += re.findall(r"background-image:\s*url\(\"([^\"]+)\"\)", html)
bg += re.findall(r"background-image:\s*url\('([^']+)'\)", html)
all_imgs = []
seen = set()
for u in urls + bg:
    u = unescape(u).split("?")[0]
    if u in seen:
        continue
    if any(x in u.lower() for x in (".jpg", ".jpeg", ".png", ".webp", ".svg", ".gif")):
        seen.add(u)
        all_imgs.append(u)

# Visible text from data-test-id="text"
texts = []
for m in re.finditer(
    r'data-test-id="text"[^>]*>(.*?)</(?:p|h1|h2|h3|span|div)>',
    html,
    flags=re.I | re.S,
):
    t = re.sub(r"<[^>]+>", " ", m.group(1))
    t = unescape(t)
    t = re.sub(r"\s+", " ", t).replace("\xa0", " ").strip()
    if len(t) >= 3 and any("\u0400" <= c <= "\u04FF" for c in t):
        texts.append(t)

# Dedupe preserve order
uniq_texts = []
seen_t = set()
for t in texts:
    if t not in seen_t:
        seen_t.add(t)
        uniq_texts.append(t)

# Headings specifically
headings = []
for m in re.finditer(r"<h([12])[^>]*>(.*?)</h\1>", html, flags=re.I | re.S):
    t = re.sub(r"<[^>]+>", " ", m.group(2))
    t = unescape(re.sub(r"\s+", " ", t)).replace("\xa0", " ").strip()
    if t:
        headings.append((m.group(1), t))

# Link labels near promo cards
card_blocks = []
for m in re.finditer(
    r'background-image:\s*url\(&quot;(https://alfabank\.servicecdn\.ru/[^&]+)&quot;\);[^>]*>.*?<p[^>]*data-test-id="text"[^>]*>(.*?)</p>(?:\s*<p[^>]*data-test-id="text"[^>]*>(.*?)</p>)?',
    html,
    flags=re.I | re.S,
):
    title = re.sub(r"<[^>]+>", " ", m.group(2))
    title = unescape(re.sub(r"\s+", " ", title)).replace("\xa0", " ").strip()
    sub = ""
    if m.group(3):
        sub = re.sub(r"<[^>]+>", " ", m.group(3))
        sub = unescape(re.sub(r"\s+", " ", sub)).replace("\xa0", " ").strip()
    img = unescape(m.group(1))
    card_blocks.append({"img": img, "title": title, "subtitle": sub})

out = ROOT / "web" / "public" / "landing" / "_parsed.json"
out.parent.mkdir(parents=True, exist_ok=True)
payload = {
    "headings": headings[:40],
    "texts": uniq_texts[:200],
    "cards": card_blocks[:60],
    "images": all_imgs[:120],
}
out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"headings={len(headings)} texts={len(uniq_texts)} cards={len(card_blocks)} images={len(all_imgs)}")
print(f"wrote {out}")
for h in headings[:25]:
    print(f"H{h[0]}: {h[1][:100]}")
print("--- cards ---")
for c in card_blocks[:20]:
    print(f"- {c['title'][:50]} | {c['subtitle'][:40]} | {c['img'][-60:]}")
