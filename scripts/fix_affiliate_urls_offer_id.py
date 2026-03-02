"""
Fix affiliate URLs using correct Rakuten Offer ID format (Canada).
------------------------------------------------------------------
Correct format (from Rakuten dashboard working links):
  https://click.linksynergy.com/link?id=NkCKklbxWBc&offerid={OFFER_ID}.{feed_product_id}&type=2&murl={encoded_product_url}

Ashley HomeStore Canada: Offer ID 1086810 (MID 47134 is NOT used in link)
TOV Furniture:            Offer ID 1672324 (MID 53375 is NOT used in link)

Uses feed_product_id from affiliate_products when present; otherwise extracts it from
the existing affiliate_url's offerid param (e.g. offerid=47134.XXXX -> XXXX).
Extracts murl from existing affiliate_url and rebuilds with correct offerid + type=2.

Usage:
  python3 scripts/fix_affiliate_urls_offer_id.py
"""

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
ASHLEY_OFFER_ID = "1086810"
TOV_OFFER_ID = "1672324"


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


def extract_feed_product_id_from_affiliate_url(url: str) -> Optional[str]:
    """
    Extract feed_product_id from existing affiliate_url's offerid param.
    Current (wrong) format uses offerid=MID.feed_product_id (e.g. 47134.12345).
    Returns the part after the dot, or None if not found.
    """
    if not url or not url.startswith("http"):
        return None
    try:
        parsed = urllib.parse.urlparse(url)
        qs = urllib.parse.parse_qs(parsed.query)
        offerid = qs.get("offerid", [""])[0]
        if not offerid or "." not in offerid:
            return None
        return offerid.split(".", 1)[1].strip() or None
    except Exception:
        return None


def build_correct_affiliate_url(murl: str, offer_id: str, feed_product_id: str) -> str:
    """Build URL in correct Rakuten format: offerid={offer_id}.{feed_product_id}, type=2."""
    offerid_param = f"{offer_id}.{feed_product_id}"
    if "%" in murl:
        murl_param = murl
    else:
        murl_param = urllib.parse.quote(murl, safe="")
    return (
        f"https://click.linksynergy.com/link"
        f"?id={PUBLISHER_ID}&offerid={offerid_param}&type=2&murl={murl_param}"
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

    # Fetch all affiliate_products with feed_product_id
    print("Fetching affiliate_products (id, retailer, affiliate_url, feed_product_id)...")
    rows = []
    page_size = 1000
    offset = 0
    while True:
        r = requests.get(
            f"{url}/rest/v1/affiliate_products",
            headers={**headers, "Prefer": "count=exact"},
            params={
                "select": "id,retailer,affiliate_url,feed_product_id",
                "limit": page_size,
                "offset": offset,
            },
            timeout=60,
        )
        r.raise_for_status()
        batch = r.json()
        rows.extend(batch)
        total = int(r.headers.get("content-range", "0/0").split("/")[-1])
        offset += len(batch)
        if len(batch) < page_size:
            break
    print(f"  Fetched {len(rows)} rows (total in DB: {total})\n")

    updates_ashley = []
    updates_tov = []
    skipped = 0
    errors = []

    for row in rows:
        rid = row.get("id")
        retailer = (row.get("retailer") or "").strip().lower()
        old_url = row.get("affiliate_url") or ""
        feed_product_id = (row.get("feed_product_id") or "").strip()

        if retailer == "ashley":
            offer_id = ASHLEY_OFFER_ID
            updates_list = updates_ashley
        elif retailer == "tov":
            offer_id = TOV_OFFER_ID
            updates_list = updates_tov
        else:
            skipped += 1
            continue

        if not feed_product_id:
            feed_product_id = extract_feed_product_id_from_affiliate_url(old_url)
        if not feed_product_id:
            errors.append((rid, f"missing feed_product_id retailer={retailer}"))
            skipped += 1
            continue

        murl = extract_murl_from_affiliate_url(old_url)
        if not murl:
            errors.append((rid, "could not extract murl from existing URL"))
            skipped += 1
            continue

        new_url = build_correct_affiliate_url(murl, offer_id, feed_product_id)
        updates_list.append((rid, new_url))

    # Apply updates in parallel (Ashley + TOV combined for faster run)
    all_updates = updates_ashley + updates_tov

    def patch_one(item):
        rid, new_url = item
        r = requests.patch(
            f"{url}/rest/v1/affiliate_products?id=eq.{rid}",
            headers=headers,
            json={"affiliate_url": new_url},
            timeout=30,
        )
        return rid, r.status_code in (200, 204)

    print(f"Updating {len(updates_ashley)} Ashley + {len(updates_tov)} TOV URLs (20 parallel)...")
    updated = 0
    with ThreadPoolExecutor(max_workers=20) as ex:
        futures = {ex.submit(patch_one, u): u for u in all_updates}
        for i, future in enumerate(as_completed(futures)):
            _, ok = future.result()
            if ok:
                updated += 1
            if (i + 1) % 500 == 0:
                print(f"  Progress: {i + 1}/{len(all_updates)}")
    ashley_updated = len(updates_ashley)
    tov_updated = len(updates_tov)
    print(f"  Total updated: {updated}")
    print(f"  Ashley: {ashley_updated} rows.")
    print(f"  TOV: {tov_updated} rows.\n")

    # Summary
    print("--- Summary ---")
    print(f"  Ashley HomeStore Canada: {ashley_updated} rows updated")
    print(f"  TOV Furniture:            {tov_updated} rows updated")
    print(f"  Skipped (other retailer / no feed_product_id / no murl): {skipped}")
    if errors:
        print(f"  Errors: {len(errors)}")
        for e in errors[:5]:
            print(f"    {e}")

    # Sample URLs for testing
    sample_ashley = updates_ashley[0][1] if updates_ashley else None
    sample_tov = updates_tov[0][1] if updates_tov else None
    print("\n--- Sample URLs (test in browser) ---")
    if sample_ashley:
        print(f"  Ashley: {sample_ashley}")
    else:
        print("  Ashley: (no rows updated)")
    if sample_tov:
        print(f"  TOV:    {sample_tov}")
    else:
        print("  TOV: (no rows updated)")
    print()


if __name__ == "__main__":
    main()
