"""
Rakuten → Supabase Import: Ashley HomeStore Canada
----------------------------------------------------
1. Downloads the full Ashley feed from Rakuten FTP.
2. Parses pipe-delimited rows using the column positions identified
   from the feed template inspection.
3. Filters to in-stock rows only.
4. Upserts into affiliate_products table in Supabase (SKU as unique key).

Requirements (run once if missing):
  pip3 install requests

Credentials read from .env.local:
  RAKUTEN_FTP_USER, RAKUTEN_FTP_PASS
  VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY

Usage:
  python3 scripts/rakuten_import_ashley.py
"""

import ftplib
import gzip
import os
import sys
import json
import time
import urllib.parse

# ─── CONFIG ───────────────────────────────────────────────────────────────────
FTP_HOST       = "aftp.linksynergy.com"
MERCHANT_MID   = "47134"
RETAILER_SLUG  = "ashley"

# Try full feed first, fall back to template (same data, Rakuten naming)
FEED_FILENAMES = [
    f"{MERCHANT_MID}_4632350_mp_template.txt.gz",
    f"{MERCHANT_MID}_4632350_mp.txt.gz",
]

LOCAL_DOWNLOAD_DIR = "scripts/feeds"
BATCH_SIZE         = 500   # rows per Supabase upsert request
# ──────────────────────────────────────────────────────────────────────────────

# Ashley HomeStore Canada pipe-delimited column positions (from feed inspection)
COL = {
    "product_name":   1,
    "sku":            2,
    "category":       3,
    "subcategory":    4,
    "affiliate_url":  5,
    "image_url":      6,
    "sale_price":     7,
    "description":    8,
    "price":          13,
    "brand":          16,
    "model_number":   19,
    "availability":   21,
    "upc":            23,
    "currency":       25,
    "color":          32,
}

IN_STOCK_VALUES = {"in stock", "in-stock", "yes", "1", "true", "available"}


# ─── HELPERS ─────────────────────────────────────────────────────────────────

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
            elif ":" in line:
                k, _, v = line.partition(":")
                env[k.strip()] = v.strip()
    return env


def to_numeric(val):
    """Return float or None from a string price."""
    val = (val or "").strip()
    if not val:
        return None
    try:
        return float(val.replace(",", ""))
    except ValueError:
        return None


def parse_row(values):
    """
    Extract the columns we want from a pipe-split row list.
    Returns a dict ready to upsert, or None if the row should be skipped.
    """
    if len(values) < 26:
        return None

    # Check both col[21] (Ashley) and col[22] (TOV) — feeds differ in which column is populated
    availability = values[COL["availability"]].strip().lower()
    availability_code = values[22].strip().lower() if len(values) > 22 else ""
    if availability not in IN_STOCK_VALUES and availability_code not in IN_STOCK_VALUES:
        return None
    # Use whichever column has the value
    if not availability:
        availability = values[22].strip() if len(values) > 22 else ""

    sku = values[COL["sku"]].strip()
    if not sku:
        return None

    # Feed column 0 is the product ID used in offerid (required for valid links)
    feed_product_id = values[0].strip() if values else ""

    raw_url = values[COL["affiliate_url"]].strip()
    if not raw_url:
        return None

    # Rakuten format from feed: offerid=<LSN OID>.<feed_product_id>&type=15
    # Use feed_product_id (col 0), NOT sku; type=15 matches the feed
    try:
        qs = urllib.parse.parse_qs(urllib.parse.urlparse(raw_url).query)
        murl = qs.get("murl", [""])[0]
        if murl and feed_product_id:
            murl_encoded = urllib.parse.quote(murl, safe="")
            affiliate_url = (
                f"https://click.linksynergy.com/link"
                f"?id=NkCKklbxWBc&offerid={MERCHANT_MID}.{feed_product_id}"
                f"&type=15&murl={murl_encoded}"
            )
        else:
            affiliate_url = raw_url.replace("<LSN EID>", "NkCKklbxWBc")
    except Exception:
        affiliate_url = raw_url.replace("<LSN EID>", "NkCKklbxWBc")

    product_name = values[COL["product_name"]].strip()
    if not product_name:
        return None

    return {
        "sku":             sku,
        "feed_product_id": feed_product_id or None,
        "product_name":    product_name,
        "category":        values[COL["category"]].strip() or None,
        "subcategory":     values[COL["subcategory"]].strip() or None,
        "affiliate_url":   affiliate_url,
        "image_url":     values[COL["image_url"]].strip() or None,
        "price":         to_numeric(values[COL["price"]]),
        "sale_price":    to_numeric(values[COL["sale_price"]]),
        "description":   values[COL["description"]].strip() or None,
        "brand":         values[COL["brand"]].strip() or None,
        "model_number":  values[COL["model_number"]].strip() or None,
        "availability":  values[COL["availability"]].strip() or None,
        "upc":           values[COL["upc"]].strip() or None,
        "currency":      values[COL["currency"]].strip() or "CAD",
        "color":         values[COL["color"]].strip() if len(values) > COL["color"] else None,
        "retailer":      RETAILER_SLUG,
    }


def upsert_batch(url, headers, batch):
    """POST a batch of rows to Supabase with upsert (merge on SKU)."""
    try:
        import requests
    except ImportError:
        print("\n❌  'requests' library not found.")
        print("    Run:  pip3 install requests")
        sys.exit(1)

    endpoint = f"{url}/rest/v1/affiliate_products"
    resp = requests.post(
        endpoint,
        headers={**headers, "Prefer": "resolution=merge-duplicates,return=minimal"},
        params={"on_conflict": "sku"},
        data=json.dumps(batch),
        timeout=60,
    )
    if resp.status_code not in (200, 201):
        raise RuntimeError(
            f"Supabase upsert failed: {resp.status_code} {resp.text[:300]}"
        )


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    print("\n=== Rakuten → Supabase Import: Ashley HomeStore Canada ===\n")

    env = load_env()
    FTP_USER      = env.get("RAKUTEN_FTP_USER") or env.get("FTP username")
    FTP_PASS      = env.get("RAKUTEN_FTP_PASS") or env.get("FTP password")
    SUPABASE_URL  = (env.get("SUPABASE_URL") or env.get("VITE_SUPABASE_URL", "")).rstrip("/")
    SERVICE_KEY   = env.get("SUPABASE_SERVICE_KEY") or env.get("SUPABASE_SERVICE_ROLE_KEY")

    if not FTP_USER or not FTP_PASS:
        print("❌  FTP credentials not found in .env.local")
        print("    Expected: RAKUTEN_FTP_USER and RAKUTEN_FTP_PASS")
        sys.exit(1)

    if not SUPABASE_URL:
        print("❌  VITE_SUPABASE_URL not found in .env.local")
        sys.exit(1)

    if not SERVICE_KEY:
        print("❌  SUPABASE_SERVICE_KEY not found in .env.local")
        print()
        print("    You need the service role key to write to Supabase from a script.")
        print("    Get it from: Supabase Dashboard → Project Settings → API")
        print("    It starts with: eyJhbGci... (longer than the anon key)")
        print("    Add this line to .env.local:")
        print("      SUPABASE_SERVICE_KEY=your_service_role_key_here")
        sys.exit(1)

    headers = {
        "Content-Type":  "application/json",
        "apikey":        SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
    }

    print(f"  FTP user:      {FTP_USER}")
    print(f"  Supabase URL:  {SUPABASE_URL}")
    print()

    # ── Step 1: Download feed ──────────────────────────────────────────────
    os.makedirs(LOCAL_DOWNLOAD_DIR, exist_ok=True)
    local_path = None

    for fname in FEED_FILENAMES:
        lp = os.path.join(LOCAL_DOWNLOAD_DIR, fname)
        # Re-use cached file if already downloaded today to save time
        if os.path.exists(lp):
            age_h = (time.time() - os.path.getmtime(lp)) / 3600
            if age_h < 23:
                print(f"[1/4] Using cached feed: {lp}  ({age_h:.1f}h old)")
                local_path = lp
                break
            else:
                print(f"[1/4] Cached file is {age_h:.0f}h old — re-downloading.")

    if not local_path:
        print(f"[1/4] Connecting to FTP: {FTP_HOST} ...")
        try:
            ftp = ftplib.FTP(FTP_HOST, timeout=120)
            ftp.login(FTP_USER, FTP_PASS)
            ftp.set_pasv(True)
            print(f"      Logged in as: {FTP_USER}")
            available = ftp.nlst()
        except ftplib.all_errors as e:
            print(f"❌  FTP connection failed: {e}")
            sys.exit(1)

        target = None
        for fname in FEED_FILENAMES:
            if fname in available:
                target = fname
                break
        if not target:
            print(f"❌  None of these files found on FTP: {FEED_FILENAMES}")
            print(f"    Available .gz files: {[f for f in available if f.endswith('.gz')]}")
            ftp.quit()
            sys.exit(1)

        local_path = os.path.join(LOCAL_DOWNLOAD_DIR, target)
        print(f"      Downloading {target} ...")
        with open(local_path, "wb") as fh:
            ftp.retrbinary(f"RETR {target}", fh.write)
        ftp.quit()
        size_mb = os.path.getsize(local_path) / 1_048_576
        print(f"      Downloaded: {size_mb:.1f} MB  → {local_path}")

    # ── Step 2: Parse feed ─────────────────────────────────────────────────
    print(f"\n[2/4] Parsing feed ...")
    total_rows  = 0
    skipped     = 0
    parsed      = []

    with gzip.open(local_path, "rt", encoding="utf-8", errors="replace") as gz:
        for line in gz:
            line = line.rstrip("\n")
            if not line or line.startswith("HDR") or line.startswith("TRL"):
                continue
            total_rows += 1
            values = line.split("|")
            row = parse_row(values)
            if row:
                parsed.append(row)
            else:
                skipped += 1

    in_stock_count = len(parsed)
    print(f"      Total rows in feed:    {total_rows:,}")
    print(f"      In-stock / usable:     {in_stock_count:,}")
    print(f"      Skipped (OOS/invalid): {skipped:,}")

    if in_stock_count == 0:
        print("\n⚠️  No in-stock rows found.")
        print("   Check that the feed file is the full catalog (not just a template).")
        print(f"   File: {local_path}")
        sys.exit(0)

    # ── Step 3: Upsert to Supabase ─────────────────────────────────────────
    print(f"\n[3/4] Upserting to Supabase in batches of {BATCH_SIZE} ...")
    upserted = 0
    batches   = [parsed[i:i+BATCH_SIZE] for i in range(0, len(parsed), BATCH_SIZE)]
    for idx, batch in enumerate(batches, 1):
        print(f"      Batch {idx}/{len(batches)} ({len(batch)} rows) ...", end=" ", flush=True)
        upsert_batch(SUPABASE_URL, headers, batch)
        upserted += len(batch)
        print(f"done  [{upserted:,} total]")

    # ── Step 4: Verify ─────────────────────────────────────────────────────
    print(f"\n[4/4] Verifying row count in Supabase ...")
    try:
        import requests
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/affiliate_products",
            headers={**headers, "Prefer": "count=exact"},
            params={"retailer": f"eq.{RETAILER_SLUG}", "select": "id"},
            timeout=30,
        )
        total_in_db = int(resp.headers.get("content-range", "0/0").split("/")[-1])
        print(f"      affiliate_products rows for '{RETAILER_SLUG}': {total_in_db:,}")
    except Exception as e:
        print(f"      (Could not verify count: {e})")

    print(f"\n✅  Import complete!")
    print(f"   {upserted:,} rows upserted for retailer='{RETAILER_SLUG}'")
    print(f"   Check Supabase Table Editor: affiliate_products\n")


if __name__ == "__main__":
    main()
