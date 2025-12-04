/**
 * Clean Invalid Products Script
 * 
 * This script removes all products with invalid/placeholder URLs from the database.
 * Only products with valid, working URLs will remain.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jvbrrgqepuhabwddufby.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2YnJyZ3FlcHVoYWJ3ZGR1ZmJ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYxNDM4MiwiZXhwIjoyMDgwMTkwMzgyfQ.t_JwWcLhZJDrXBcuBMV0PVdkJoVYZPWi4kkPXHJnXZE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function isValidAmazonAsin(asin: string | null): boolean {
  if (!asin) return false;
  // Valid ASIN is exactly 10 characters, alphanumeric
  if (asin.length !== 10) return false;
  // Check for placeholder patterns
  if (asin.includes('XMAS') || asin.includes('xmas')) return false;
  // Valid ASIN pattern: starts with B followed by 9 alphanumeric characters
  return /^B[0-9A-Z]{9}$/.test(asin);
}

function isValidProductUrl(url: string | null, merchant: string): boolean {
  if (!url) return false;
  
  // Must start with http/https
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }
  
  // Check for placeholder patterns
  if (url.includes('XMAS') || url.includes('xmas') || url.includes('placeholder')) {
    return false;
  }
  
  // For Amazon, check ASIN in URL
  if (merchant === 'Amazon' && url.includes('amazon.ca/dp/')) {
    const asinMatch = url.match(/\/dp\/([A-Z0-9]+)/);
    if (!asinMatch) return false;
    return isValidAmazonAsin(asinMatch[1]);
  }
  
  // For other retailers, URL must not be just a domain
  const justDomainPatterns = [
    'https://www.wayfair.com',
    'https://www.westelm.com',
    'https://www.ikea.com',
    'https://www.walmart.com',
    'https://www.walmart.ca',
    'https://www.wayfair.ca',
  ];
  
  if (justDomainPatterns.some(pattern => url === pattern || url === pattern + '/')) {
    return false;
  }
  
  // URL should have a path beyond the domain
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.length > 1;
  } catch {
    return false;
  }
}

async function cleanInvalidProducts() {
  console.log('🧹 Starting cleanup of invalid products...\n');

  // Fetch all products
  const { data: products, error } = await supabase
    .from('products')
    .select('*');

  if (error) {
    console.error('❌ Error fetching products:', error);
    return;
  }

  console.log(`📊 Total products in database: ${products?.length || 0}\n`);

  const toDelete: string[] = [];
  const valid: string[] = [];

  // Analyze each product
  for (const product of products || []) {
    const isValid = isValidProductUrl(product.product_url, product.merchant);
    
    if (!isValid) {
      toDelete.push(product.id);
    } else {
      valid.push(product.id);
    }
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('  CLEANUP SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`✅ Valid products to keep: ${valid.length}`);
  console.log(`🗑️  Invalid products to delete: ${toDelete.length}\n`);

  // Delete invalid products
  if (toDelete.length > 0) {
    console.log(`🗑️  Deleting ${toDelete.length} invalid products...\n`);
    
    // Delete in batches of 100
    let totalDeleted = 0;
    for (let i = 0; i < toDelete.length; i += 100) {
      const batch = toDelete.slice(i, i + 100);
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .in('id', batch);

      if (deleteError) {
        console.error(`❌ Error deleting batch ${i / 100 + 1}:`, deleteError);
      } else {
        totalDeleted += batch.length;
        console.log(`   ✓ Deleted batch ${i / 100 + 1} (${batch.length} products)`);
      }
    }
    console.log(`\n✅ Successfully deleted ${totalDeleted} invalid products\n`);
  }

  // Show sample of remaining valid products
  const { data: remainingProducts } = await supabase
    .from('products')
    .select('product_name, merchant, product_url, external_id')
    .limit(10);

  console.log('═══════════════════════════════════════════════════════');
  console.log('  REMAINING VALID PRODUCTS');
  console.log('═══════════════════════════════════════════════════════\n');
  
  if (remainingProducts && remainingProducts.length > 0) {
    console.log(`📋 Sample of ${remainingProducts.length} valid products:\n`);
    remainingProducts.forEach((p, i) => {
      console.log(`${i + 1}. ${p.product_name}`);
      console.log(`   Merchant: ${p.merchant}`);
      console.log(`   External ID: ${p.external_id || 'N/A'}`);
      console.log(`   URL: ${p.product_url.substring(0, 80)}${p.product_url.length > 80 ? '...' : ''}\n`);
    });
  } else {
    console.log('⚠️  No valid products remaining in database.');
    console.log('   Users will see "no products found" message until Amazon PA-API is configured.\n');
  }

  // Final count
  const { count: finalCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  console.log('═══════════════════════════════════════════════════════');
  console.log(`✨ Cleanup complete! ${finalCount || 0} valid products remaining.\n`);
}

cleanInvalidProducts().catch(console.error);
