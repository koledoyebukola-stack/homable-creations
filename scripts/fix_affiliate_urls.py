"""
Fix affiliate URLs in affiliate_products table.
----------------------------------------------
Rakuten correct format (Publisher ID: NkCKklbxWBc):
  https://click.linksynergy.com/link?id=NkCKklbxWBc&offerid={MID}.{feed_product_id}&type=15&murl={encoded}
  Ashley: offerid = 47134.{feed_product_id}  (feed_product_id = col 0 from feed, NOT sku)
  TOV:    offerid = 53375.{feed_product_id}

The feed uses offerid=<LSN OID>.<feed_product_id>; we must use feed_product_id from column 0.
type=15 matches the feed (type=2 was wrong).

Usage:
  python3 scripts/fix_affiliate_urls.py

Requires feed files in scripts/feeds/ (47134_*.gz, 53375_*.gz).
"""

import gzip
import os
import sys
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

try:
    import requests
except ImportError:
    print("pip3 install requests")
    sys.exit(1)

PUBLISHER_ID = "NkCKklbxWBc"
ASHLEY_MID = "47134"
TOV_MID = "53375"
FEED_DIR = "scripts/feeds"


def load_env(path=".env.local"):
    env = {}
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    abs_path = os.path.join(root, path)
    if not os.path.exists(abs_path):
        return env
    with open(abs_path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip()
    return env


def build_sku_to_feed_product_id() -> dict:
    """Parse feed files and build {retailer: {sku: feed_product_id}}."""
    sku_to_feed_id = {"ashley": {}, "tov": {}}
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    feed_dir = os.path.join(root, FEED_DIR)

    if not os.path.exists(feed_dir):
        print(f"  Warning: feed dir not found: {feed_dir}")
        return sku_to_feed_id

    for retailer, mid in [("ashley", "47134"), ("tov", "53375")]:
        for fname in sorted(os.listdir(feed_dir)):
            if fname.startswith(mid) and fname.endswith(".gz"):
                path = os.path.join(feed_dir, fname)
                try:
                    with gzip.open(path, "rt", encoding="utf-8", errors="replace") as gz:
                        for line in gz:
                            line = line.rstrip("\n")
                            if not line or line.startswith("HDR") or line.startswith("TRL"):
                                continue
                            vals = line.split("|")
                            if len(vals) >= 3:
                                feed_product_id = vals[0].strip()
                                sku = vals[2].strip()
                                if feed_product_id and sku:
                                    sku_to_feed_id[retailer][sku] = feed_product_id
                except Exception as e:
                    print(f"  Warning: could not parse {fname}: {e}")
                break

    return sku_to_feed_id


def extract_murl_from_affiliate_url(url: str) -> Optional[str]:
    """Extract murl (encoded product URL) from existing affiliate_url."""
    if not url or not url.startswith("http"):
        return None
    try:
        parsed = urllib.parse.urlparse(url)
        qs = urllib.parse.parse_qs(parsed.query)
        murl = qs.get("murl", [""])[0]
        return murl if murl else None
    except Exception:
        return None


def build_correct_affiliate_url(murl: str, mid: str, feed_product_id: str) -> str:
    """Build URL in correct Rakuten format (feed format: type=15, offerid=mid.feed_product_id)."""
    offerid = f"{mid}.{feed_product_id}"
    if "%" in murl:
        murl_param = murl
    else:
        murl_param = urllib.parse.quote(murl, safe="")
    return (
        f"https://click.linksynergy.com/link"
        f"?id={PUBLISHER_ID}&offerid={offerid}&type=15&murl={murl_param}"
    )


def main():
    env = load_env()
    url = (env.get("VITE_SUPABASE_URL") or env.get("SUPABASE_URL", "")).rstrip("/")
    key = env.get("SUPABASE_SERVICE_KEY") or env.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        print("Need VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local")
        sys.exit(1)

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    # Build sku -> feed_product_id from feed files
    print("Loading feed files for sku -> feed_product_id mapping...")
    sku_to_feed_id = build_sku_to_feed_product_id()
    ashley_count = len(sku_to_feed_id["ashley"])
    tov_count = len(sku_to_feed_id["tov"])
    print(f"  Ashley: {ashley_count} SKUs mapped")
    print(f"  TOV: {tov_count} SKUs mapped")

    # Fetch all affiliate_products
    print("Fetching affiliate_products...")
    rows = []
    page_size = 1000
    offset = 0
    while True:
        r = requests.get(
            f"{url}/rest/v1/affiliate_products",
            headers={**headers, "Prefer": "count=exact"},
            params={"select": "id,sku,retailer,affiliate_url", "limit": page_size, "offset": offset},
            timeout=60,
        )
        r.raise_for_status()
        batch = r.json()
        rows.extend(batch)
        total = int(r.headers.get("content-range", "0/0").split("/")[-1])
        offset += len(batch)
        if len(batch) < page_size:
            break
    print(f"  Fetched {len(rows)} rows (total in DB: {total})")

    updates = []
    skipped = 0
    errors = []

    for row in rows:
        rid = row.get("id")
        sku = (row.get("sku") or "").strip()
        retailer = (row.get("retailer") or "").strip().lower()
        old_url = row.get("affiliate_url") or ""

        if not sku:
            skipped += 1
            continue

        mid = ASHLEY_MID if retailer == "ashley" else TOV_MID if retailer == "tov" else None
        if not mid:
            skipped += 1
            continue

        feed_product_id = sku_to_feed_id.get(retailer, {}).get(sku)
        if not feed_product_id and retailer == "ashley":
            # Ashley feed uses feed_product_id = MID + SKU (concatenated)
            feed_product_id = f"{mid}{sku}"
        if not feed_product_id:
            errors.append((rid, f"no feed_product_id for sku={sku}"))
            skipped += 1
            continue

        murl = extract_murl_from_affiliate_url(old_url)
        if not murl:
            errors.append((rid, "could not extract murl from existing URL"))
            skipped += 1
            continue

        new_url = build_correct_affiliate_url(murl, mid, feed_product_id)
        updates.append((rid, new_url))

    # PATCH each row in parallel (20 workers)
    print(f"Updating {len(updates)} rows (20 parallel)...")
    updated = 0

    def patch_one(item):
        rid, new_url = item
        r = requests.patch(
            f"{url}/rest/v1/affiliate_products?id=eq.{rid}",
            headers=headers,
            json={"affiliate_url": new_url},
            timeout=30,
        )
        return rid, r.status_code in (200, 204), r.text[:80] if r.status_code not in (200, 204) else None

    with ThreadPoolExecutor(max_workers=20) as ex:
        futures = {ex.submit(patch_one, u): u for u in updates}
        for i, future in enumerate(as_completed(futures)):
            rid, ok, err = future.result()
            if ok:
                updated += 1
            else:
                errors.append((rid, err or "unknown"))
            if (i + 1) % 500 == 0:
                print(f"  Progress: {i + 1}/{len(updates)}")

    print(f"\nUpdated: {updated}")
    print(f"Skipped: {skipped}")
    if errors:
        print(f"Errors: {len(errors)}")
        for e in errors[:5]:
            print(f"  {e}")


if __name__ == "__main__":
    main()
