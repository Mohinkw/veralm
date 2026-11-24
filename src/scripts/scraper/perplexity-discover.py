#!/usr/bin/env python3
"""
VeraLM — Perplexity Discover Scraper
=====================================
Scrapes trending questions/topics from perplexity.ai/discover across all
categories, optionally fetches the full multi-section answers & references
via /rest/article/{slug}, and saves them as VeraLM-ready Markdown JSON.

No AI used. Pure Playwright + in-browser fetch().

Usage:
    python3 src/scripts/scraper/perplexity-discover.py --full
    python3 src/scripts/scraper/perplexity-discover.py --topics tech finance arts --pages 2 --limit 20 --full
"""

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sys.exit("Error: playwright not installed. Run: pip install playwright && playwright install chromium")

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────

CHROME_PATH = "/usr/bin/google-chrome"
OUTPUT_DIR  = Path(__file__).resolve().parents[3] / "data" / "discover"

ALL_TOPICS = ["top", "tech", "finance", "arts", "sports", "entertainment"]

# Map Perplexity topic slugs -> VeraLM category slugs
TOPIC_TO_CATEGORY = {
    "top":           "business",
    "tech":          "technology",
    "finance":       "business",
    "arts":          "education",
    "sports":        "health-wellness",
    "entertainment": "education",
}

KNOWLEDGE_SIGNALS = [
    "what is", "what are", "how does", "how do", "why does", "why is",
    "explain", "difference between", " vs ", "versus", "how to",
    "what causes", "effect of", "impact of", "history of",
    "study", "research", "evidence", "science", "scientist",
    "data", "statistics", "rate", "percent", "billion", "trillion",
    "discovery", "breakthrough", "trial", "analysis", "report",
    "mechanism", "algorithm", "model", "ai", "quantum", "chip", "gpu",
    "dna", "rna", "gene", "brain", "cancer", "vaccine", "longevity",
    "economics", "inflation", "tariff", "gdp", "ipo", "market", "debt",
    "climate", "energy", "nuclear", "battery", "fusion",
]

# ─────────────────────────────────────────────────────────────────────────────
# MARKDOWN FORMATTER (ZERO AI)
# ─────────────────────────────────────────────────────────────────────────────

def clean_inline_citations(text: str) -> str:
    """Remove Perplexity [1][2] style citation markers for clean prose."""
    return re.sub(r'\[(\d{1,3})\]', '', text).replace('  ', ' ').strip()


def build_article_markdown(title: str, entries: list[dict]) -> dict | None:
    """
    Assemble /rest/article/{slug} entries[] into VeraLM-formatted Markdown:
      # Title
      <intro prose>
      ## Section Heading
      <section prose>
      ## Primary References & Sources
      1. [Title](URL)
    """
    if not entries:
        return None

    sections = []
    all_refs = []
    seen_urls = set()

    for idx, entry in enumerate(entries):
        raw_text = entry.get("text")
        if not raw_text:
            continue

        try:
            parsed = json.loads(raw_text) if isinstance(raw_text, str) else raw_text
        except Exception:
            continue

        answer = clean_inline_citations(parsed.get("answer") or "")
        if not answer:
            continue

        heading = (entry.get("query_str") or "").strip()
        if idx == 0:
            sections.append(answer)
        else:
            if heading and heading.lower() != title.lower():
                sections.append(f"## {heading}\n\n{answer}")
            else:
                sections.append(answer)

        for wr in (parsed.get("web_results") or []):
            url = (wr.get("url") or "").strip()
            name = (wr.get("name") or url).strip()
            snippet = (wr.get("snippet") or "").strip()
            if url and url not in seen_urls:
                seen_urls.add(url)
                all_refs.append({
                    "title": name[:200],
                    "url": url,
                    "snippet": snippet[:300],
                })

    if not sections:
        return None

    body_md = f"# {title}\n\n" + "\n\n".join(sections)

    if all_refs:
        ref_lines = [
            f"{i}. [{r['title']}]({r['url']})"
            for i, r in enumerate(all_refs[:12], 1)
        ]
        body_md += "\n\n## Primary References & Sources\n\n" + "\n".join(ref_lines)

    word_count = len(body_md.split())
    first_para = clean_inline_citations(sections[0]).replace("\n", " ")
    excerpt = first_para[:180].strip()

    return {
        "full_markdown": body_md,
        "word_count": word_count,
        "excerpt": excerpt,
        "references": all_refs[:12],
        "source_links": [r["url"] for r in all_refs[:12]],
    }


# ─────────────────────────────────────────────────────────────────────────────
# BROWSER SCRAPER
# ─────────────────────────────────────────────────────────────────────────────

def scrape_all_topics(
    topics: list[str],
    pages_per_topic: int,
    limit: int,
    fetch_full: bool = False,
    batch_size: int = 8,
) -> list[dict]:
    all_items = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            executable_path=CHROME_PATH,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
            ],
        )
        ctx = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
            extra_http_headers={"Accept-Language": "en-US,en;q=0.9"},
        )

        page = ctx.new_page()

        print("[scraper] Loading perplexity.ai/discover (Cloudflare handshake)...", flush=True)
        page.goto(
            "https://www.perplexity.ai/discover",
            wait_until="domcontentloaded",
            timeout=30000,
        )
        page.wait_for_timeout(4500)
        print(f"[scraper] Page title: {page.title()}", flush=True)

        # Discover dynamic topic UUIDs
        topics_resp = page.evaluate("""async () => {
            const r = await fetch('https://www.perplexity.ai/rest/discover/topics?version=2.18&source=default', {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
            if (!r.ok) return { error: r.status };
            return await r.json();
        }""")

        slug_to_id = {"top": "top"}
        if topics_resp and isinstance(topics_resp.get("all_topics"), list):
            for t in topics_resp["all_topics"]:
                if t.get("slug") and t.get("id"):
                    slug_to_id[t["slug"]] = t["id"]
        print(f"[scraper] Topic map: {list(slug_to_id.keys())}", flush=True)

        # Fetch feed slugs for each topic
        for topic_slug in topics:
            topic_param = slug_to_id.get(topic_slug)
            if not topic_param:
                print(f"\n[scraper] ⚠️  Unknown topic slug '{topic_slug}', skipping.", flush=True)
                continue

            print(f"\n[scraper] ── Topic: {topic_slug} ({topic_param}) ──", flush=True)
            next_token = None

            for page_num in range(pages_per_topic):
                url = (
                    f"https://www.perplexity.ai/rest/discover/feed"
                    f"?limit={limit}&offset={page_num * limit}"
                    f"&topic={topic_param}&version=2.18&source=default"
                )
                if next_token:
                    url += f"&next_token={next_token}"

                result = page.evaluate(f"""async () => {{
                    const r = await fetch({json.dumps(url)}, {{
                        method: 'GET',
                        credentials: 'include',
                        headers: {{
                            'Accept': 'application/json',
                            'Referer': 'https://www.perplexity.ai/discover',
                        }}
                    }});
                    if (!r.ok) return {{ error: r.status }};
                    return await r.json();
                }}""")

                if not result or result.get("error") or result.get("status") != "success":
                    print(f"[scraper]   Feed error/end: {result}", flush=True)
                    break

                batch = result.get("items", [])
                if not batch:
                    break

                for raw in batch:
                    parsed = parse_item(raw, topic_slug)
                    if parsed:
                        all_items.append(parsed)

                next_token = result.get("next_token")
                print(
                    f"[scraper]   page {page_num+1}: {len(batch)} items "
                    f"(running total: {len(all_items)})",
                    flush=True,
                )

                if not next_token:
                    break
                time.sleep(0.8)

            time.sleep(1.0)

        all_items = deduplicate(all_items)

        # Fetch full article bodies in concurrent batches
        if fetch_full and all_items:
            slugs_to_fetch = [i for i in all_items if i.get("slug")]
            print(f"\n[scraper] Fetching full bodies for {len(slugs_to_fetch)} articles (batch size {batch_size})...", flush=True)

            fetched_count = 0
            for start in range(0, len(slugs_to_fetch), batch_size):
                chunk = slugs_to_fetch[start:start + batch_size]
                chunk_slugs = [c["slug"] for c in chunk]

                responses = page.evaluate(f"""async (slugs) => {{
                    return await Promise.all(slugs.map(async (slug) => {{
                        try {{
                            const r = await fetch(
                                `https://www.perplexity.ai/rest/article/${{encodeURIComponent(slug)}}?version=2.18&source=default`,
                                {{ credentials: 'include', headers: {{ 'Accept': 'application/json' }} }}
                            );
                            if (!r.ok) return {{ slug, error: r.status }};
                            const data = await r.json();
                            return {{ slug, entries: data.entries || [] }};
                        }} catch (e) {{
                            return {{ slug, error: String(e) }};
                        }}
                    }}));
                }}""", chunk_slugs)

                resp_map = {r["slug"]: r for r in (responses or [])}
                for item in chunk:
                    r = resp_map.get(item["slug"])
                    if r and r.get("entries"):
                        assembled = build_article_markdown(item["title"], r["entries"])
                        if assembled:
                            item.update(assembled)
                            fetched_count += 1

                print(
                    f"[scraper]   batch {start//batch_size + 1}: "
                    f"{fetched_count}/{len(slugs_to_fetch)} full articles assembled",
                    flush=True,
                )
                time.sleep(0.4)

        browser.close()

    return all_items


# ─────────────────────────────────────────────────────────────────────────────
# PARSER & OUTPUT
# ─────────────────────────────────────────────────────────────────────────────

def parse_item(raw: dict, perplexity_topic: str) -> dict | None:
    title = (raw.get("title") or raw.get("short_title") or "").strip()
    if not title or len(title) < 8:
        return None

    slug = raw.get("slug", "")
    description = (raw.get("description") or raw.get("summary") or "").strip()
    query_count = raw.get("query_count") or 0

    text_to_check = f"{title} {description}".lower()
    is_knowledge = (
        perplexity_topic in ("tech", "finance", "arts")
        or any(sig in text_to_check for sig in KNOWLEDGE_SIGNALS)
    )

    web_results = raw.get("bullet_summary_web_results_preload") or []
    source_urls = [r["url"] for r in web_results[:5] if r.get("url")]
    snippet = next(
        (r["snippet"] for r in web_results[:3] if r.get("snippet")), ""
    )[:300]

    return {
        "title":              title,
        "slug":               slug,
        "url":                f"https://www.perplexity.ai/discover/{perplexity_topic}/{slug}" if slug else "",
        "perplexity_topic":   perplexity_topic,
        "category_slug":      TOPIC_TO_CATEGORY.get(perplexity_topic) or "technology",
        "is_knowledge_based": is_knowledge,
        "query_count":        query_count,
        "description":        description[:400],
        "source_urls":        source_urls,
        "ground_truth_hint":  snippet,
        "scraped_at":         datetime.now(timezone.utc).isoformat(),
    }


def deduplicate(items: list[dict]) -> list[dict]:
    seen, out = set(), []
    for item in items:
        key = item["title"].lower().strip()
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out


def save_results(items: list[dict], out_path: Path, knowledge_only_path: Path):
    out_path.parent.mkdir(parents=True, exist_ok=True)

    existing = []
    if out_path.exists():
        with open(out_path) as f:
            try:
                existing = json.load(f)
            except json.JSONDecodeError:
                existing = []

    existing_by_title = {e["title"]: e for e in existing}
    for item in items:
        # Update existing if new item has full_markdown and old didn't
        if item["title"] not in existing_by_title or item.get("full_markdown"):
            existing_by_title[item["title"]] = item

    merged = list(existing_by_title.values())

    with open(out_path, "w") as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)

    knowledge = [i for i in merged if i["is_knowledge_based"]]
    with open(knowledge_only_path, "w") as f:
        json.dump(knowledge, f, indent=2, ensure_ascii=False)

    full_count = sum(1 for i in merged if i.get("full_markdown"))
    print(f"\n[scraper] ✅ Total saved: {len(merged)} items ({full_count} with full Markdown)")
    print(f"[scraper] 📄 All:            {out_path}")
    print(f"[scraper] 🧠 Knowledge-only: {knowledge_only_path} ({len(knowledge)} items)")


def main():
    parser = argparse.ArgumentParser(description="VeraLM — Perplexity Discover Scraper (no AI)")
    parser.add_argument("--topics", nargs="*", default=ALL_TOPICS)
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--pages", type=int, default=3)
    parser.add_argument("--full", action="store_true", help="Fetch full multi-section article bodies")
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--out", type=str, default=None)
    args = parser.parse_args()

    today = datetime.now().strftime("%Y-%m-%d")
    out_path  = Path(args.out) if args.out else OUTPUT_DIR / f"{today}.json"
    know_path = out_path.parent / f"{today}-knowledge-only.json"

    print(f"[scraper] VeraLM Perplexity Discover Scraper (full={args.full})")
    print(f"[scraper] Topics : {args.topics}")
    print(f"[scraper] Config : {args.limit} items/page × {args.pages} pages × {len(args.topics)} topics\n")

    items = scrape_all_topics(args.topics, args.pages, args.limit, fetch_full=args.full, batch_size=args.batch_size)
    save_results(items, out_path, know_path)


if __name__ == "__main__":
    main()
