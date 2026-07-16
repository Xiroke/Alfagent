"""Map image hashes to nearby Russian labels; write UTF-8 report."""
from __future__ import annotations

import base64
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
text = (ROOT / "main_page.html").read_text(encoding="utf-8")
pat = re.compile(
    r"url\(data:image/(?:png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=\n\r]+)\)",
)

seen: set[str] = set()
lines: list[str] = []

for m in pat.finditer(text):
    b64 = re.sub(r"\s+", "", m.group(1))
    try:
        data = base64.b64decode(b64)
    except Exception:
        continue
    if len(data) < 800:
        continue
    digest = hashlib.md5(data).hexdigest()[:10]
    if digest in seen:
        continue
    seen.add(digest)

    before = text[max(0, m.start() - 400) : m.start()]
    after = text[m.end() : m.end() + 1500]
    window = before + after
    texts = re.findall(
        r"wordWrap: 'break-word'\}\}>((?:[^<{]|<br/>){2,100})",
        window,
    )
    clean: list[str] = []
    for t in texts:
        t = re.sub(r"<br/>", " ", t)
        t = re.sub(r"\s+", " ", t).strip()
        if any("\u0400" <= c <= "\u04FF" for c in t):
            clean.append(t[:90])
    # also background color near image
    bg = re.search(r"background: '([^']+)'", before[-200:] + after[:200])
    bgv = bg.group(1) if bg else "?"
    lines.append(
        f"asset_*_{digest}.png | bg={bgv} | "
        + (" | ".join(clean[:5]) if clean else "(no text)")
    )

out = ROOT / "web" / "public" / "landing" / "_map.txt"
out.write_text("\n".join(lines), encoding="utf-8")
print(f"wrote {out} ({len(lines)} entries)")
