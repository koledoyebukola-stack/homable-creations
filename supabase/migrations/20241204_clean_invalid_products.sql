-- Clean Invalid Products Migration
-- This removes all products with invalid/placeholder URLs

BEGIN;

-- Delete products with invalid Amazon ASINs (not exactly 10 characters or contains XMAS)
DELETE FROM products 
WHERE merchant = 'Amazon' 
  AND (
    external_id IS NULL 
    OR LENGTH(external_id) != 10
    OR external_id LIKE '%XMAS%'
    OR external_id LIKE '%xmas%'
    OR product_url LIKE '%XMAS%'
    OR product_url LIKE '%xmas%'
  );

-- Delete products with just domain URLs (no product path)
DELETE FROM products
WHERE product_url IN (
  'https://www.wayfair.com',
  'https://www.wayfair.com/',
  'https://www.westelm.com',
  'https://www.westelm.com/',
  'https://www.ikea.com',
  'https://www.ikea.com/',
  'https://www.walmart.com',
  'https://www.walmart.com/',
  'https://www.walmart.ca',
  'https://www.walmart.ca/',
  'https://www.wayfair.ca',
  'https://www.wayfair.ca/'
);

-- Delete products with placeholder in URL
DELETE FROM products
WHERE product_url LIKE '%placeholder%';

COMMIT;