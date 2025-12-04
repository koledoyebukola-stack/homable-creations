# Christmas Soft Launch Setup Guide

This guide explains how to set up the Christmas seed products and verify the system is working correctly.

---

## 🎄 Part 1: Database Setup

### Step 1: Add `is_seed` Column to Products Table

**Go to:** Supabase Dashboard → SQL Editor

**Run this SQL:**
```sql
-- Copy and paste the contents of /workspace/shadcn-ui/supabase/migrations/add_is_seed_column.sql

BEGIN;

-- Add is_seed column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'is_seed'
    ) THEN
        ALTER TABLE products ADD COLUMN is_seed boolean DEFAULT false;
    END IF;
END $$;

-- Create index on is_seed for faster queries
CREATE INDEX IF NOT EXISTS idx_products_is_seed ON products(is_seed) WHERE is_seed = true;

-- Create composite index for seed product queries
CREATE INDEX IF NOT EXISTS idx_products_seed_category ON products(is_seed, category) WHERE is_seed = true;

COMMIT;
```

**Expected Result:**
```
Success. No rows returned.
```

---

## 🎁 Part 2: Seed Christmas Products

### Step 1: Prepare Your Christmas Products JSON

Create a JSON array with your Christmas products. Each product should have this format:

```json
[
  {
    "external_id": "B0ABCD1234",
    "merchant": "Amazon",
    "product_name": "6ft Pre-Lit Christmas Tree with 200 LED Lights",
    "category": "Decor",
    "price": 89.99,
    "currency": "CAD",
    "image_url": "https://m.media-amazon.com/images/I/...",
    "product_url": "https://www.amazon.ca/dp/B0ABCD1234?tag=homablecrea03-20",
    "description": "Pre-lit artificial Christmas tree with warm white LED lights",
    "color": "Green",
    "materials": ["PVC", "Metal"],
    "style": "Traditional",
    "tags": ["christmas", "tree", "lights", "holiday"],
    "rating": 4.5,
    "review_count": 234,
    "shipping_info": "Prime eligible",
    "availability": "in_stock"
  },
  {
    "external_id": "B0XYZ5678",
    "merchant": "Amazon",
    "product_name": "Christmas Garland with Pine Cones and Berries - 9ft",
    "category": "Decor",
    "price": 34.99,
    "currency": "CAD",
    "image_url": "https://m.media-amazon.com/images/I/...",
    "product_url": "https://www.amazon.ca/dp/B0XYZ5678?tag=homablecrea03-20",
    "description": "Realistic pine garland with red berries and pine cones",
    "color": "Green",
    "materials": ["PVC", "Wire"],
    "style": "Traditional",
    "tags": ["christmas", "garland", "mantel", "holiday"],
    "rating": 4.7,
    "review_count": 156
  }
]
```

**Important Notes:**
- `external_id` + `merchant` combination must be unique (used for upsert)
- All product URLs should include your Associates tag: `?tag=homablecrea03-20`
- `category` should match your detected item categories: `Decor`, `Lighting`, `Seating`, `Tables`, `Rugs`, `Storage`
- `tags` should include relevant Christmas keywords for better matching

---

### Step 2: Run the Seed Script

**Option A: Using Node.js (Recommended)**

1. Open `/workspace/shadcn-ui/scripts/seed_christmas_products.ts`
2. Replace the empty `CHRISTMAS_PRODUCTS` array with your JSON array
3. Run the script:

```bash
cd /workspace/shadcn-ui
npx tsx scripts/seed_christmas_products.ts
```

**Expected Output:**
```
Starting to seed 25 Christmas products...
✅ Successfully seeded 25 Christmas products!

Sample seeded products:
  - 6ft Pre-Lit Christmas Tree with 200 LED Lights (Amazon) - $89.99 CAD
  - Christmas Garland with Pine Cones and Berries - 9ft (Amazon) - $34.99 CAD
  - Red Velvet Christmas Stockings Set of 4 (Amazon) - $29.99 CAD

✨ Seeding complete!
```

**Option B: Using Supabase SQL Editor**

If you prefer to insert directly via SQL:

```sql
INSERT INTO products (
  external_id, merchant, product_name, category, price, currency,
  image_url, product_url, description, color, materials, style,
  tags, rating, review_count, shipping_info, availability, is_seed
) VALUES
  ('B0ABCD1234', 'Amazon', '6ft Pre-Lit Christmas Tree with 200 LED Lights', 'Decor', 89.99, 'CAD',
   'https://m.media-amazon.com/images/I/...', 'https://www.amazon.ca/dp/B0ABCD1234?tag=homablecrea03-20',
   'Pre-lit artificial Christmas tree with warm white LED lights', 'Green',
   ARRAY['PVC', 'Metal'], 'Traditional', ARRAY['christmas', 'tree', 'lights', 'holiday'],
   4.5, 234, 'Prime eligible', 'in_stock', true)
ON CONFLICT (external_id, merchant) DO UPDATE SET
  product_name = EXCLUDED.product_name,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url,
  is_seed = true;
```

---

## ✅ Part 3: Verify Setup

### Verification 1: Check Products Table

**Go to:** Supabase Dashboard → Table Editor → `products`

**Filter:** `is_seed = true`

**You should see:**
- All your Christmas products with `is_seed = true`
- `merchant` = "Amazon" (or your specified merchants)
- `product_url` contains `tag=homablecrea03-20`
- `currency` = "CAD"

**Example row:**
```json
{
  "id": "uuid-here",
  "external_id": "B0ABCD1234",
  "merchant": "Amazon",
  "product_name": "6ft Pre-Lit Christmas Tree with 200 LED Lights",
  "category": "Decor",
  "price": 89.99,
  "currency": "CAD",
  "is_seed": true,
  "product_url": "https://www.amazon.ca/dp/B0ABCD1234?tag=homablecrea03-20"
}
```

---

### Verification 2: Test Product Search Flow

1. **Upload a Christmas decor photo** (tree, garland, stockings, etc.)
2. **Wait for analysis** to complete
3. **Check the results page** - you should see your seed products

**Go to:** Supabase Dashboard → Edge Functions → `app_8574c59127_search_products` → Logs

**Look for these log messages:**
```
[requestId] Amazon credentials not configured, using seed products
[requestId] Querying Christmas seed products for category: Decor
[requestId] Found 3 matching seed products
[requestId] Using existing seed products, skipping insert
[requestId] Created 3 product matches
```

**If Amazon credentials ARE configured but return no results:**
```
[requestId] Amazon credentials found, searching Amazon.ca
[requestId] Amazon returned 0 items
[requestId] Querying Christmas seed products for category: Decor
[requestId] Found 3 matching seed products
```

---

### Verification 3: Check Item Product Matches

**Go to:** Supabase Dashboard → Table Editor → `item_product_matches`

**Look for:**
- Rows linking `detected_item_id` to seed `product_id`
- `match_score` values like 0.95, 0.88, 0.81
- `is_top_pick = true` for the first match

---

## 🎯 Part 4: Homepage Christmas Theme

The homepage has been updated with:

✅ **Holiday Badge:** "Holiday Beta · Christmas Decor Focus"
✅ **Hero Headline:** "Finish Your Holiday Look for Less"
✅ **Subheadline:** Mentions Christmas decor and holiday timing
✅ **Promo Strip:** "Last minute Christmas shoppers: upload your inspiration and find matching decor in minutes."
✅ **Carousel Images:** First 4 slides show Christmas decor (tree, dining, entryway, mantel), followed by 2 neutral images

**Generated Christmas Images:**
- `/assets/carousel-christmas-tree-1.jpg` - Christmas living room with tree
- `/assets/carousel-christmas-dining-2.jpg` - Christmas dining table
- `/assets/carousel-christmas-entryway-3.jpg` - Christmas entryway console
- `/assets/carousel-christmas-mantel-4.jpg` - Christmas mantel decoration

---

## 🔄 Product Search Priority Order

The system now follows this priority:

1. **Amazon Products** (if credentials are configured and return results)
2. **Christmas Seed Products** (fallback when Amazon fails or returns nothing)
3. **Mock Products** (only as last resort if no seed products exist)

**Matching Logic for Seed Products:**
- First tries to match by `category`
- Optionally filters by `style` or `tags`
- Returns up to 3 products per detected item
- If no category match, returns any 3 seed products

---

## 🚀 Quick Start Checklist

- [ ] Run SQL migration to add `is_seed` column
- [ ] Prepare Christmas products JSON array (25-50 products recommended)
- [ ] Run seed script or insert via SQL
- [ ] Verify products appear in table with `is_seed = true`
- [ ] Test upload flow with Christmas photo
- [ ] Check logs to confirm seed products are being used
- [ ] Verify product URLs include Associates tag
- [ ] Test clicking "View Product" links

---

## 📊 Recommended Product Mix

For best results, seed products across these categories:

- **Decor** (40%): Trees, garland, wreaths, ornaments, stockings
- **Lighting** (20%): String lights, candles, lamps
- **Tables** (15%): Centerpieces, table runners, place settings
- **Rugs** (10%): Holiday-themed area rugs
- **Seating** (10%): Festive throw pillows, chair covers
- **Storage** (5%): Gift boxes, decorative baskets

**Tag Suggestions:**
- christmas, holiday, festive, winter
- tree, garland, wreath, ornament, stocking
- lights, candles, decoration
- red, green, gold, silver, white

---

## 🐛 Troubleshooting

**Problem:** Seed products not appearing in results

**Solutions:**
1. Check `is_seed = true` in products table
2. Verify category matches detected item category
3. Check edge function logs for "Querying Christmas seed products"
4. Try uploading a different Christmas photo

---

**Problem:** Product URLs missing Associates tag

**Solutions:**
1. Verify all seed products have `?tag=homablecrea03-20` in `product_url`
2. Re-run seed script with corrected URLs
3. Check existing products and update manually if needed

---

**Problem:** No products returned at all

**Solutions:**
1. Check if `is_seed` column exists in products table
2. Verify seed products were inserted successfully
3. Check edge function logs for errors
4. Ensure detected items have valid categories

---

## 📞 Support

If you encounter issues:
1. Check Supabase logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure seed products have valid data (no null required fields)
4. Test with a simple Christmas tree photo first

---

**Happy Holidays! 🎄✨**