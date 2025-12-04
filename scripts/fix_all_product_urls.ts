/**
 * Comprehensive Product URL Fix Script
 * 
 * This script fixes all invalid product URLs in the database by:
 * 1. Deleting products with invalid/placeholder URLs (non-Amazon seed products)
 * 2. Fixing Amazon seed products with correct affiliate tags
 * 3. Keeping only valid, working product URLs
 * 
 * Usage: pnpm exec tsx scripts/fix_all_product_urls.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jvbrrgqepuhabwddufby.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2YnJyZ3FlcHVoYWJ3ZGR1ZmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTQzODIsImV4cCI6MjA4MDE5MDM4Mn0.aoAyKQyZZwrTbocGqKLxai1kUccAvcY45-B06huKPGo';

const CORRECT_AMAZON_TAG = 'homablecrea03-20';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixAllProductUrls() {
  console.log('🔧 Starting comprehensive product URL fix...\n');

  // Fetch all products
  const { data: products, error } = await supabase
    .from('products')
    .select('*');

  if (error) {
    console.error('❌ Error fetching products:', error);
    return;
  }

  console.log(`📊 Found ${products?.length || 0} total products\n`);

  const toDelete: string[] = [];
  const toUpdate: Array<{ id: string; product_url: string }> = [];
  const valid: string[] = [];

  // Analyze each product
  for (const product of products || []) {
    const url = product.product_url;

    // Invalid URL patterns - mark for deletion
    if (!url || 
        url === 'https://www.wayfair.com' ||
        url === 'https://www.westelm.com' ||
        url === 'https://www.ikea.com' ||
        url === 'https://www.walmart.com' ||
        url === 'https://www.walmart.ca' ||
        url === 'https://www.wayfair.ca' ||
        url.includes('example.com') ||
        url.includes('XMAS') ||
        url.includes('placeholder') ||
        (!url.startsWith('http://') && !url.startsWith('https://'))) {
      toDelete.push(product.id);
      continue;
    }

    // Amazon products - check affiliate tag
    if (product.merchant === 'Amazon' || url.includes('amazon.ca')) {
      const tagMatch = url.match(/[?&]tag=([^&]+)/);
      
      if (!tagMatch) {
        // Missing tag - add it
        const separator = url.includes('?') ? '&' : '?';
        toUpdate.push({
          id: product.id,
          product_url: `${url}${separator}tag=${CORRECT_AMAZON_TAG}`
        });
      } else if (tagMatch[1] !== CORRECT_AMAZON_TAG) {
        // Wrong tag - fix it
        toUpdate.push({
          id: product.id,
          product_url: url.replace(/tag=[^&]+/, `tag=${CORRECT_AMAZON_TAG}`)
        });
      } else {
        // Valid Amazon URL with correct tag
        valid.push(product.id);
      }
    } else {
      // Non-Amazon product - if URL looks valid, keep it
      if (url.includes('/') && url.split('/').length > 3) {
        valid.push(product.id);
      } else {
        toDelete.push(product.id);
      }
    }
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('  FIX SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`✅ Valid products (no action): ${valid.length}`);
  console.log(`🔧 Products to update: ${toUpdate.length}`);
  console.log(`🗑️  Products to delete: ${toDelete.length}\n`);

  // Delete invalid products
  if (toDelete.length > 0) {
    console.log(`🗑️  Deleting ${toDelete.length} invalid products...`);
    
    // Delete in batches of 100
    for (let i = 0; i < toDelete.length; i += 100) {
      const batch = toDelete.slice(i, i + 100);
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .in('id', batch);

      if (deleteError) {
        console.error(`❌ Error deleting batch ${i / 100 + 1}:`, deleteError);
      } else {
        console.log(`   ✓ Deleted batch ${i / 100 + 1} (${batch.length} products)`);
      }
    }
    console.log(`✅ Deleted ${toDelete.length} invalid products\n`);
  }

  // Update Amazon products with correct tags
  if (toUpdate.length > 0) {
    console.log(`🔧 Updating ${toUpdate.length} Amazon products with correct affiliate tags...`);
    
    let successCount = 0;
    let errorCount = 0;

    for (const update of toUpdate) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ product_url: update.product_url })
        .eq('id', update.id);

      if (updateError) {
        console.error(`❌ Failed to update ${update.id}:`, updateError.message);
        errorCount++;
      } else {
        successCount++;
      }
    }

    console.log(`✅ Updated ${successCount} products`);
    if (errorCount > 0) {
      console.log(`❌ Failed to update ${errorCount} products`);
    }
    console.log('');
  }

  // Final count
  const { count: finalCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  console.log('═══════════════════════════════════════════════════════');
  console.log('  FINAL RESULTS');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`📊 Total products remaining: ${finalCount || 0}`);
  console.log(`✅ All remaining products have valid URLs\n`);

  // Show sample of remaining products
  const { data: sampleProducts } = await supabase
    .from('products')
    .select('product_name, merchant, product_url')
    .limit(5);

  if (sampleProducts && sampleProducts.length > 0) {
    console.log('📋 Sample of remaining products:\n');
    sampleProducts.forEach((p, i) => {
      console.log(`${i + 1}. ${p.product_name}`);
      console.log(`   Merchant: ${p.merchant}`);
      console.log(`   URL: ${p.product_url.substring(0, 80)}${p.product_url.length > 80 ? '...' : ''}\n`);
    });
  }

  console.log('✨ Product URL fix complete!\n');
}

fixAllProductUrls().catch(console.error);