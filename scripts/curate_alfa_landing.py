"""Extract curated landing sections from Alfa HTML dump."""
from __future__ import annotations

import json
import re
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "main_page.html").read_text(encoding="utf-8", errors="ignore")

# Card pattern: bg image + title (+ optional subtitle)
card_re = re.compile(
    r'background-image:\s*url\(&quot;(https://alfabank\.servicecdn\.ru/[^&]+)&quot;\);'
    r"(?:(?!</a>).)*?"
    r'data-test-id="text"[^>]*>(.*?)</p>'
    r'(?:\s*<p[^>]*data-test-id="text"[^>]*>(.*?)</p>)?',
    re.I | re.S,
)


def clean_html_text(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s)
    s = unescape(s)
    return re.sub(r"\s+", " ", s).replace("\xa0", " ").strip()


cards = []
seen_img = set()
for m in card_re.finditer(html):
    img = unescape(m.group(1))
    title = clean_html_text(m.group(2))
    sub = clean_html_text(m.group(3)) if m.group(3) else ""
    key = (img, title)
    if key in seen_img or len(title) < 2:
        continue
    seen_img.add(key)
    cards.append({"img": img, "title": title, "subtitle": sub})

# Hero texts
hero_title = "Открой свой бизнес вместе с сервисами Альфа-Банка"
hero_sub = "Откройте бизнес быстро, в любой точке страны"
if hero_title not in html:
    # fallback search
    m = re.search(r"Открой свой бизнес[^<]{0,80}", html)
    if m:
        hero_title = clean_html_text(m.group(0))

# Find hero-ish wide images near business phrase
idx = html.find("Открой свой бизнес")
hero_imgs = []
if idx != -1:
    window = html[max(0, idx - 8000) : idx + 12000]
    for u in re.findall(r"https://alfabank\.servicecdn\.ru/[^\"'&)\s]+", window):
        u = unescape(u)
        if any(ext in u.lower() for ext in (".jpg", ".jpeg", ".png", ".webp")):
            if u not in hero_imgs:
                hero_imgs.append(u)

# Segment tabs near "Выбирайте лучшее"
tabs = []
idx2 = html.find("Выбирайте лучшее")
if idx2 != -1:
    window = html[idx2 : idx2 + 5000]
    for t in re.findall(r'data-test-id="text"[^>]*>([^<]{3,40})</', window):
        t = clean_html_text(t)
        if t and t not in tabs and t != "Выбирайте лучшее":
            tabs.append(t)
        if len(tabs) >= 6:
            break

# Curate product grid: prefer 267x298 assets (SME / product tiles)
product_cards = [
    c
    for c in cards
    if "267x298" in c["img"] or "267-298" in c["img"] or "CardPromo_267" in c["img"]
]
if len(product_cards) < 8:
    product_cards = cards[:8]

# Side hero cards: look for credit card / income near hero
side_keywords = ("Кредитная карта", "Гарантируем", "доход", "Кредит наличными", "Бесплатная")
side_cards = []
for c in cards:
    if any(k.lower() in (c["title"] + c["subtitle"]).lower() for k in side_keywords):
        side_cards.append(c)

# Promo carousel cards often 364x364
promo_cards = [c for c in cards if "364" in c["img"] or "364x364" in c["img"]]
if len(promo_cards) < 4:
    promo_cards = [c for c in cards if c not in product_cards][8:16]

# Travel / azs banner
travel = next((c for c in cards if "заправ" in c["title"].lower() or "АЗС" in c["title"]), None)
employer = next((c for c in cards if "работодател" in c["title"].lower()), None)
smart = next((c for c in cards if "умн" in c["title"].lower() or "информац" in c["title"].lower()), None)

payload = {
    "hero": {
        "title": hero_title,
        "subtitle": hero_sub,
        "cta": "Открыть бизнес",
        "images": hero_imgs[:10],
    },
    "tabs": tabs,
    "product_cards": product_cards[:12],
    "side_cards": side_cards[:6],
    "promo_cards": promo_cards[:8],
    "travel": travel,
    "employer": employer,
    "smart": smart,
    "all_cards_sample": cards[:30],
    "card_count": len(cards),
}

out = ROOT / "web" / "public" / "landing" / "_curated.json"
out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({k: (len(v) if isinstance(v, list) else bool(v)) for k, v in payload.items()}, ensure_ascii=False))
