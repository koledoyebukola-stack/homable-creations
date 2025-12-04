/**
 * Clean Invalid Products using SQL
 * This uses BackendManager to execute SQL directly
 */

// This script will generate SQL to delete invalid products
// We'll identify products with invalid URLs based on patterns

console.log('Generating SQL to clean invalid products...\n');

const sql = `
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

-- Show remaining count
SELECT COUNT(*) as remaining_products FROM products;
`;

console.log(sql);
console.log('\n✅ SQL generated. Copy and run this in Supabase SQL Editor.');
