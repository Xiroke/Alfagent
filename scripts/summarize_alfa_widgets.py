"""Summarize Alfa pageContent widgets for landing rebuild."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "main_page.html").read_text(encoding="utf-8", errors="ignore")
m = re.search(r'<script id="app_state" type="application/json">(.*?)</script>', html, re.S)
assert m
data = json.loads(m.group(1))
widgets = data["pageContent"]["widgets"]

# widgets might be list or dict
out_lines: list[str] = []


def walk(node, path=""):
    if isinstance(node, dict):
        name = node.get("name") or node.get("type") or node.get("widgetName")
        uid = node.get("uid") or node.get("id") or ""
        props = node.get("props") or node.get("data") or {}
        texts = []
        images = []
        # collect string props that look like titles / urls
        stack = [props, node]
        seen_ids = set()
        while stack:
            cur = stack.pop()
            if id(cur) in seen_ids:
                continue
            seen_ids.add(id(cur))
            if isinstance(cur, dict):
                for k, v in cur.items():
                    if k in {"children", "slots", "widgets"}:
                        continue
                    if isinstance(v, str):
                        if v.startswith("http") and any(
                            v.lower().endswith(ext) or f".{ext}?" in v.lower()
                            for ext in ("jpg", "jpeg", "png", "webp", "svg", "gif", "mp4")
                        ):
                            images.append(v)
                        elif "servicecdn.ru" in v or "alfabank.st" in v:
                            images.append(v)
                        elif any("\u0400" <= c <= "\u04FF" for c in v) and 3 <= len(v) <= 120:
                            texts.append(v)
                    elif isinstance(v, (dict, list)):
                        stack.append(v)
            elif isinstance(cur, list):
                stack.extend(cur)
        if name or texts or images:
            out_lines.append(
                {
                    "path": path,
                    "name": name,
                    "uid": uid,
                    "texts": texts[:8],
                    "images": images[:6],
                }
            )
        children = node.get("children") or node.get("widgets") or node.get("slots")
        if isinstance(children, list):
            for i, ch in enumerate(children):
                walk(ch, f"{path}/{name or 'node'}[{i}]")
        elif isinstance(children, dict):
            for k, ch in children.items():
                walk(ch, f"{path}/{name or 'node'}.{k}")
    elif isinstance(node, list):
        for i, ch in enumerate(node):
            walk(ch, f"{path}[{i}]")


walk(widgets)
# Also flatten cards from parsed html cards
parsed = json.loads((ROOT / "web/public/landing/_parsed.json").read_text(encoding="utf-8"))

summary = {
    "widget_count": len(out_lines),
    "interesting": [
        w
        for w in out_lines
        if w["images"]
        or any(
            key in " ".join(w["texts"]).lower()
            for key in (
                "бизнес",
                "выбирайте",
                "рассчит",
                "сервис",
                "откры",
                "карт",
                "кредит",
                "кэшбэк",
                "альфа",
            )
        )
    ][:80],
    "cards_html": parsed["cards"][:40],
}

(ROOT / "web/public/landing/_widgets_summary.json").write_text(
    json.dumps(summary, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
print("widgets scanned", len(out_lines), "interesting", len(summary["interesting"]))
# print a few hero-related
for w in summary["interesting"][:30]:
    t = " | ".join(w["texts"][:3])
    imgs = len(w["images"])
    print(f"{w['name']}: {t[:90]} imgs={imgs}")
