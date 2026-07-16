"""Find extra CDN assets for landing sections."""
from __future__ import annotations

import json
import re
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "main_page.html").read_text(encoding="utf-8", errors="ignore")

patterns = {
    "referral": r"Платим до",
    "partner_cashback": r"повышенный кэшбэк",
    "about": r"О банке",
    "services": r">Сервисы<",
    "invest_news": r"Читайте главное",
}

out: dict[str, list] = {}
for key, pat in patterns.items():
    m = re.search(pat, html)
    if not m:
        out[key] = []
        continue
    window = html[m.start() : m.start() + 15000]
    urls = []
    for u in re.findall(r"https://alfabank\.servicecdn\.ru/[^\"'&)\s]+", window):
        u = unescape(u)
        if any(ext in u.lower() for ext in (".png", ".jpg", ".jpeg", ".webp")):
            if u not in urls:
                urls.append(u)
    out[key] = urls[:12]

# Primary bento image near business CTA
m = re.search(r"Открыть бизнес", html)
if m:
    window = html[max(0, m.start() - 20000) : m.start() + 5000]
    urls = []
    for u in re.findall(r"https://alfabank\.servicecdn\.ru/[^\"'&)\s]+", window):
        u = unescape(u)
        if any(ext in u.lower() for ext in (".png", ".jpg", ".jpeg", ".webp", ".mp4")):
            if u not in urls:
                urls.append(u)
    out["open_business_nearby"] = urls[:20]

(ROOT / "web/public/landing/_extra_urls.json").write_text(
    json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
)
print("ok")
