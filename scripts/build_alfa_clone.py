"""Build exact visual clone of main_page.html for Alfagent home."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
src = (ROOT / "main_page.html").read_text(encoding="utf-8", errors="ignore")

# Stylesheets
css_links = re.findall(
    r'<link[^>]+rel="stylesheet"[^>]*>',
    src,
    flags=re.I,
)
# Prefer unique by href
seen_href: set[str] = set()
unique_css: list[str] = []
for tag in css_links:
    m = re.search(r'href="([^"]+)"', tag)
    if not m:
        continue
    href = m.group(1)
    if href in seen_href:
        continue
    seen_href.add(href)
    unique_css.append(f'<link rel="stylesheet" href="{href}">')

# Extract #alfa block: from <div id="alfa"> until app_state / first big script after content
alfa_start = src.find('<div id="alfa">')
if alfa_start < 0:
    raise SystemExit("div#alfa not found")

# End before app_state script or before async chunk scripts cluster after content
app_state = src.find('<script id="app_state"', alfa_start)
# Also find where link stylesheets start if earlier
link_start = src.find('<link data-chunk="main"', alfa_start)
end_candidates = [i for i in (app_state, link_start) if i > alfa_start]
end = min(end_candidates) if end_candidates else len(src)

alfa_html = src[alfa_start:end]

# Remove scripts inside alfa (analytics / hydration leftovers)
alfa_html = re.sub(r"<script\b[^>]*>.*?</script>", "", alfa_html, flags=re.I | re.S)
alfa_html = re.sub(r"<noscript\b[^>]*>.*?</noscript>", "", alfa_html, flags=re.I | re.S)

# Fix relative links -> alfabank.ru (keep absolute http(s) as-is)
def absolutize_href(match: re.Match[str]) -> str:
    href = match.group(1)
    if href.startswith(("http://", "https://", "mailto:", "tel:", "#", "javascript:")):
        return match.group(0)
    if href.startswith("//"):
        return f'href="https:{href}"'
    if href.startswith("/"):
        return f'href="https://alfabank.ru{href}"'
    return f'href="https://alfabank.ru/{href}"'


alfa_html = re.sub(r'href="([^"]*)"', absolutize_href, alfa_html)

# Point business registration CTAs to Alfagent
alfa_html = re.sub(
    r'(<a\b[^>]*\bhref=")https://alfabank\.ru[^"]*("(?:(?!</a>).){0,400}?>)\s*'
    r'(?:<span[^>]*>)?\s*Зарегистрировать бизнес',
    r'\1/registration" target="_top\2Зарегистрировать бизнес',
    alfa_html,
    flags=re.I | re.S,
)
alfa_html = re.sub(
    r'href="https://alfabank\.ru/sme/[^"]*register[^"]*"',
    'href="/registration" target="_top"',
    alfa_html,
    flags=re.I,
)
alfa_html = re.sub(
    r'href="https://alfabank\.ru/sme/[^"]*open[^"]*"',
    'href="/registration" target="_top"',
    alfa_html,
    flags=re.I,
)
# Product tile «Регистрация бизнеса»
alfa_html = re.sub(
    r'(<a\b[^>]*\bhref=")https://alfabank\.ru/sme/[^"]*("(?:(?!</a>).){0,800}?Регистрация\s*бизнеса)',
    r'\1/registration" target="_top\2',
    alfa_html,
    count=3,
    flags=re.I | re.S,
)

# --- Customize primary hero bento (first banner) ---
marker = 'data-test-id="bentoBanner"'
bento_at = alfa_html.find(marker)
if bento_at >= 0:
    vstart = alfa_html.find('data-test-id="video-background-container"', bento_at)
    vend = alfa_html.find('data-test-id="secondCard"', vstart)
    a_start = alfa_html.rfind("<a ", bento_at, vstart)
    if a_start >= 0 and vend > vstart:
        window = alfa_html[a_start:vend]
        # Drop video — use static black + right-side artwork
        window = re.sub(r"<video\b[^>]*>.*?</video>", "", window, count=1, flags=re.S)
        window = re.sub(
            r'(data-test-id="video-background-container" style=")',
            r'\1background-color: #B36BFF; position: relative; overflow: hidden; ',
            window,
            count=1,
        )
        # Hide original bg layer (deposit poster)
        window = re.sub(
            r'(data-test-id="video-background-image"[^>]*style=")([^"]*)"',
            r'\1display:none !important;"',
            window,
            count=1,
        )
        # Inject line-up.png on the right inside the banner
        art = (
            '<img class="alfagent-hero-art" src="/line-up.png" alt="" '
            'style="position:absolute; right:0; bottom:0; width:58%; '
            'height:auto; max-height:100%; object-fit:contain; '
            'object-position:right bottom; display:block; '
            'pointer-events:none; z-index:1;" />'
        )
        window = re.sub(
            r'(<div class="fJCxG4" data-test-id="video-background-content")',
            art + r"\1",
            window,
            count=1,
        )
        # Keep content above the art
        window = re.sub(
            r'(data-test-id="video-background-content")',
            r'\1 style="position:relative; z-index:2; max-width:46%;"',
            window,
            count=1,
        )
        window = window.replace(
            "Альфа‑Вклад",
            "Открой свой бизнес вместе с сервисами Альфа-Банка",
            1,
        )
        window = re.sub(
            r"Успейте получить 20% годовых&nbsp;—\s*только до&nbsp;31&nbsp;августа",
            "Откройте бизнес быстро, в любой точке страны",
            window,
            count=1,
        )
        window = window.replace("Открыть вклад", "Открыть бизнес", 1)
        window = re.sub(
            r'href="https://alfabank\.ru/make-money/deposits/alfa-profit-deposit-promo/"',
            'href="/registration" target="_top"',
            window,
        )
        alfa_html = alfa_html[:a_start] + window + alfa_html[vend:]

# Minimal page chrome + fit-to-width on small screens (desktop dump stays intact)
hide_css = """
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: #121212;
  }
  [role="alert"].plate__component_fesrv,
  .b0kHiW.a0kHiW { display: none !important; }

  [data-test-id="bentoBanner"] [data-test-id="video-background-container"] {
    background-color: #B36BFF !important;
  }
  [data-test-id="bentoBanner"] [data-test-id="video-background-content"] {
    position: relative;
    z-index: 2;
    max-width: 46%;
  }
  [data-test-id="bentoBanner"] .alfagent-hero-art {
    position: absolute !important;
    right: 0 !important;
    bottom: 0 !important;
    top: auto !important;
    left: auto !important;
    width: 58% !important;
    height: auto !important;
    max-height: 100% !important;
    object-fit: contain !important;
    object-position: right bottom !important;
  }

  /*
    Desktop Alfa dump is ~1200px wide. On narrower viewports we scale the whole
    page to fit — layout/composition stay identical (no broken card stacks).
  */
  #alfa {
    transform-origin: top left;
    will-change: transform;
  }
  html.alfagent-scaled,
  html.alfagent-scaled body {
    overflow-x: hidden;
    width: 100%;
  }
</style>
"""

fit_script = """
<script>
(function () {
  var DESIGN_WIDTH = 1200;
  var alfa = null;

  function fit() {
    alfa = alfa || document.getElementById('alfa');
    if (!alfa) return;

    var vw = window.innerWidth || document.documentElement.clientWidth;
    if (vw >= DESIGN_WIDTH) {
      document.documentElement.classList.remove('alfagent-scaled');
      alfa.style.width = '';
      alfa.style.transform = '';
      document.body.style.height = '';
      document.body.style.overflowX = '';
      return;
    }

    var scale = vw / DESIGN_WIDTH;
    document.documentElement.classList.add('alfagent-scaled');
    alfa.style.width = DESIGN_WIDTH + 'px';
    alfa.style.transform = 'scale(' + scale + ')';
    // Transform does not shrink layout box — pin body height to scaled content.
    var h = alfa.scrollHeight * scale;
    document.body.style.height = Math.ceil(h) + 'px';
    document.body.style.overflowX = 'hidden';
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      fit();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fit);
  } else {
    fit();
  }
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', function () {
    setTimeout(fit, 150);
  });
  // Images / late layout shifts
  window.addEventListener('load', fit);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(schedule).catch(function () {});
  }
})();
</script>
"""

doc = f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Alfagent — сервисы Альфа-Банка</title>
  {"".join(unique_css)}
  {hide_css}
</head>
<body>
{alfa_html}
{fit_script}
<script>
  document.addEventListener('click', function (e) {{
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href === '/registration' || href.indexOf('/registration') === 0) {{
      e.preventDefault();
      window.top.location.href = '/registration';
    }}
  }}, true);
</script>
</body>
</html>
"""

out = ROOT / "web" / "public" / "alfa-home.html"
out.write_text(doc, encoding="utf-8")
print(f"wrote {out} ({out.stat().st_size} bytes)")
print(f"css links: {len(unique_css)}")
print(f"alfa html chars: {len(alfa_html)}")
