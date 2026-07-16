"""Extract unique non-trivial base64 images from main_page.html."""
from __future__ import annotations

import base64
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
text = (ROOT / "main_page.html").read_text(encoding="utf-8")
outdir = ROOT / "web" / "public" / "landing"
outdir.mkdir(parents=True, exist_ok=True)

pat = re.compile(
    r"url\(data:image/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=\n\r]+)\)",
)

seen: set[str] = set()
saved: list[tuple[str, int, int]] = []

for m in pat.finditer(text):
    fmt = m.group(1)
    b64 = re.sub(r"\s+", "", m.group(2))
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
    ext = "jpg" if fmt in {"jpeg", "jpg"} else fmt
    name = f"asset_{len(saved):02d}_{digest}.{ext}"
    (outdir / name).write_bytes(data)
    saved.append((name, len(data), m.start()))

print(f"saved {len(saved)} images to {outdir}")
for name, size, pos in saved:
    print(f"{name}\t{size}\tpos={pos}")
