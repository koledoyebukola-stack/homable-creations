"""
Rakuten FTP Feed Inspector
--------------------------
Downloads the Ashley HomeStore Canada product feed template from Rakuten's FTP
server and prints its column structure so you can see what product data is
available before importing into Supabase.

Credentials are read from .env.local (RAKUTEN_FTP_USER / RAKUTEN_FTP_PASS).

Usage:
  python scripts/rakuten_inspect_feed.py
"""

import ftplib
import gzip
import os
import sys

# ─── CONFIG ───────────────────────────────────────────────────────────────────
FTP_HOST       = "aftp.linksynergy.com"
MERCHANT_MID   = "47134"          # Ashley HomeStore Canada
LOCAL_DOWNLOAD_DIR = "scripts/feeds"
ROWS_TO_PREVIEW    = 3
# ──────────────────────────────────────────────────────────────────────────────


def load_env(path=".env.local"):
    """
    Parse a .env file and return a dict.
    Handles both KEY=value (standard) and KEY: value (informal).
    Looks for the file relative to this script's project root.
    """
    env = {}
    # project root = parent of the scripts/ folder
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    abs_path = os.path.join(project_root, path)
    print(f"    Reading credentials from: {abs_path}")
    if not os.path.exists(abs_path):
        print(f"⚠️  File not found: {abs_path}")
        return env
    with open(abs_path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, val = line.partition("=")
                env[key.strip()] = val.strip()
            elif ":" in line:
                key, _, val = line.partition(":")
                env[key.strip()] = val.strip()
    return env


def main():
    # ── Load credentials from .env.local ──────────────────────────────────────
    env = load_env()

    # Try standard key names first, then the informal "FTP username / FTP password" labels
    FTP_USER = (
        env.get("RAKUTEN_FTP_USER")
        or env.get("FTP_USER")
        or env.get("FTP username")
    )
    FTP_PASS = (
        env.get("RAKUTEN_FTP_PASS")
        or env.get("FTP_PASS")
        or env.get("FTP password")
    )

    if not FTP_USER or not FTP_PASS:
        print("❌  Could not find FTP credentials in .env.local.")
        print("    Add these two lines to .env.local:")
        print("      RAKUTEN_FTP_USER=your_username")
        print("      RAKUTEN_FTP_PASS=your_password")
        sys.exit(1)

    print(f"    Credentials loaded. FTP user: {FTP_USER}")

    os.makedirs(LOCAL_DOWNLOAD_DIR, exist_ok=True)

    print(f"\n[1/4] Connecting to FTP: {FTP_HOST} ...")
    try:
        ftp = ftplib.FTP(FTP_HOST, timeout=60)
        ftp.login(FTP_USER, FTP_PASS)
        ftp.set_pasv(True)   # passive mode — required behind most NAT/firewalls
        print(f"      Connected and logged in as: {FTP_USER}")
    except ftplib.all_errors as e:
        print(f"\n❌  FTP connection failed: {e}")
        print("    Check that FTP_USER, FTP_PASS, and FTP_HOST are correct.")
        sys.exit(1)

    print("\n[2/4] Listing files in your feed directory ...")
    try:
        files = ftp.nlst()
    except ftplib.all_errors as e:
        print(f"      Could not list directory: {e}")
        ftp.quit()
        sys.exit(1)

    # Filter to files that start with the merchant MID
    matching = [f for f in files if f.startswith(MERCHANT_MID) and f.endswith(".gz")]
    all_gz = [f for f in files if f.endswith(".gz")]

    print(f"\n      All .gz files available ({len(all_gz)} total):")
    for f in sorted(all_gz):
        print(f"        {f}")

    if not matching:
        print(f"\n⚠️   No files found starting with MID '{MERCHANT_MID}'.")
        print("     Double-check your MERCHANT_MID value above.")
        print("     Files in your FTP directory are listed above — pick the right one.")
        ftp.quit()
        sys.exit(1)

    # Prefer the full feed (_mp_template.txt.gz) over the delta template
    def file_priority(fname):
        if fname.endswith("_mp_template.txt.gz") and "delta" not in fname:
            return 0
        if "template" in fname and "delta" not in fname:
            return 1
        if fname.endswith("_mp.xml.gz") and "delta" not in fname:
            return 2
        return 9
    target_file = sorted(matching, key=file_priority)[0]
    local_path = os.path.join(LOCAL_DOWNLOAD_DIR, target_file)

    if os.path.exists(local_path):
        size_mb = os.path.getsize(local_path) / (1024 * 1024)
        print(f"\n[3/4] File already downloaded: {local_path} ({size_mb:.2f} MB) — skipping.")
    else:
        print(f"\n[3/4] Downloading: {target_file}")
        print(f"      Saving to:   {local_path}")
        try:
            with open(local_path, "wb") as fh:
                ftp.retrbinary(f"RETR {target_file}", fh.write)
            size_mb = os.path.getsize(local_path) / (1024 * 1024)
            print(f"      Downloaded: {size_mb:.2f} MB")
        except ftplib.all_errors as e:
            print(f"❌  Download failed: {e}")
            ftp.quit()
            sys.exit(1)

    ftp.quit()
    print("      FTP connection closed.")

    print(f"\n[4/4] Inspecting column structure ...")
    try:
        with gzip.open(local_path, "rt", encoding="utf-8", errors="replace") as gz:
            all_lines = [line.rstrip("\n") for line in gz if line.strip()]

        print(f"\n      Total lines in file: {len(all_lines)}")

        # ── Detect delimiter ──────────────────────────────────────────────────
        # Rakuten TXT feeds are pipe-delimited.  The HDR row looks like:
        #   HDR|MID|MerchantName|timestamp
        # Data rows are the product rows (pipe-delimited).
        # TRL is the last row: TRL|count
        data_lines = [l for l in all_lines
                      if not l.startswith("HDR") and not l.startswith("TRL")]
        hdr_lines  = [l for l in all_lines if l.startswith("HDR")]
        trl_lines  = [l for l in all_lines if l.startswith("TRL")]

        if hdr_lines:
            print(f"\n  Feed header: {hdr_lines[0]}")
        if trl_lines:
            record_count = trl_lines[0].split("|")[1] if "|" in trl_lines[0] else "?"
            print(f"  Record count (TRL): {record_count}")

        # Determine delimiter from first data line
        sample = data_lines[0] if data_lines else all_lines[0]
        delimiter = "|" if sample.count("|") >= sample.count("\t") else "\t"

        # Rakuten standard column order for pipe-delimited MP feeds
        RAKUTEN_COLUMNS = [
            "product_id",
            "product_name",
            "sku",
            "category_1",
            "category_2",
            "tracking_url",
            "description",
            "retail_price",
            "sale_price",
            "product_url",
            "image_url",
            "upc",
            "brand_name",
            "condition",
            "availability",
            "keywords",
            "advertiser_category",
            "shipping_cost",
            "currency",
        ]

        # Count columns from the first data row to verify
        first_row_values = data_lines[0].split(delimiter) if data_lines else []
        num_cols = len(first_row_values)

        # Build column name list
        if num_cols <= len(RAKUTEN_COLUMNS):
            columns = RAKUTEN_COLUMNS[:num_cols]
        else:
            columns = RAKUTEN_COLUMNS + [f"col_{i}" for i in range(len(RAKUTEN_COLUMNS), num_cols)]

        print(f"\n{'='*65}")
        print(f"  FEED FILE:     {target_file}")
        print(f"  DELIMITER:     pipe (|)")
        print(f"  DATA ROWS:     {len(data_lines)}")
        print(f"  COLUMNS:       {num_cols}")
        print(f"{'='*65}")
        print("\n  Column index → Column name:")
        for i, col in enumerate(columns):
            print(f"    [{i:>2}]  {col}")

        # Sample rows
        print(f"\n{'='*65}")
        print(f"  SAMPLE PRODUCT DATA ({min(ROWS_TO_PREVIEW, len(data_lines))} rows):")
        print(f"{'='*65}")
        for row_num, row_line in enumerate(data_lines[:ROWS_TO_PREVIEW]):
            values = row_line.split(delimiter)
            print(f"\n  ── Product {row_num + 1} ──")
            for i, col in enumerate(columns):
                val = values[i].strip() if i < len(values) else "(missing)"
                if val:
                    print(f"    {col:<22} {val[:100]}")

    except Exception as e:
        print(f"❌  Could not read feed file: {e}")
        sys.exit(1)

    print(f"\n✅  Done. Feed saved to: {local_path}")
    print("    You can open it with Excel or any text editor (it's tab-separated).")
    print("    Useful columns to look for: product name, price, image URL, "
          "buy URL / affiliate URL, category, SKU/product ID.\n")


if __name__ == "__main__":
    main()
