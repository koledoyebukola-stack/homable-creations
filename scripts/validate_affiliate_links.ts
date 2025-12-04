/**
 * Affiliate Link Validation Script
 * 
 * This script validates that all Amazon.ca product links have the correct affiliate tag.
 * Run this script to check and fix affiliate links in the products table.
 * 
 * Usage: npx tsx scripts/validate_affiliate_links.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jvbrrgqepuhabwddufby.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Your Amazon.ca affiliate tag
const AMAZON_AFFILIATE_TAG = 'homable0f-20';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface Product {
  id: string;
  product_url: string;
  merchant: string;
}

function validateAndFixAmazonUrl(url: string): { isValid: boolean; fixedUrl: string | null; issue: string } {
  if (!url) {
    return { isValid: false, fixedUrl: null, issue: 'Empty URL' };
  }

  // Check if it's an Amazon.ca URL
  if (!url.includes('amazon.ca')) {
    return { isValid: true, fixedUrl: null, issue: 'Not an Amazon.ca URL' };
  }

  // Check if URL already has the correct tag
  if (url.includes(`tag=${AMAZON_AFFILIATE_TAG}`)) {
    return { isValid: true, fixedUrl: null, issue: 'Already has correct tag' };
  }

  // Check if URL has a different tag
  const tagMatch = url.match(/tag=([^&]+)/);
  if (tagMatch) {
    const fixedUrl = url.replace(/tag=[^&]+/, `tag=${AMAZON_AFFILIATE_TAG}`);
    return { isValid: false, fixedUrl, issue: `Wrong tag: ${tagMatch[1]}` };
  }

  // URL doesn't have a tag - add it
  const separator = url.includes('?') ? '&' : '?';
  const fixedUrl = `${url}${separator}tag=${AMAZON_AFFILIATE_TAG}`;
  return { isValid: false, fixedUrl, issue: 'Missing tag' };
}

async function validateAllAffiliateLinks() {
  console.log('🔍 Starting affiliate link validation...\n');

  // Fetch all products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, product_url, merchant')
    .not('product_url', 'is', null);

  if (error) {
    console.error('❌ Error fetching products:', error);
    return;
  }

  if (!products || products.length === 0) {
    console.log('ℹ️  No products found in database');
    return;
  }

  console.log(`📊 Found ${products.length} products to validate\n`);

  const issues: Array<{
    id: string;
    merchant: string;
    originalUrl: string;
    issue: string;
    fixedUrl: string | null;
  }> = [];

  // Validate each product
  for (const product of products) {
    const result = validateAndFixAmazonUrl(product.product_url);
    
    if (!result.isValid && result.fixedUrl) {
      issues.push({
        id: product.id,
        merchant: product.merchant,
        originalUrl: product.product_url,
        issue: result.issue,
        fixedUrl: result.fixedUrl,
      });
    }
  }

  // Report findings
  console.log('📋 Validation Results:\n');
  console.log(`✅ Valid links: ${products.length - issues.length}`);
  console.log(`⚠️  Issues found: ${issues.length}\n`);

  if (issues.length > 0) {
    console.log('🔧 Issues breakdown:');
    const issueTypes = issues.reduce((acc, item) => {
      acc[item.issue] = (acc[item.issue] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(issueTypes).forEach(([issue, count]) => {
      console.log(`   - ${issue}: ${count} products`);
    });

    console.log('\n❓ Would you like to fix these issues? (y/n)');
    console.log('   Run with --fix flag to automatically update: npx tsx scripts/validate_affiliate_links.ts --fix\n');

    // If --fix flag is present, update the database
    if (process.argv.includes('--fix')) {
      console.log('🔄 Updating products with correct affiliate tags...\n');

      let successCount = 0;
      let errorCount = 0;

      for (const issue of issues) {
        const { error } = await supabase
          .from('products')
          .update({ product_url: issue.fixedUrl })
          .eq('id', issue.id);

        if (error) {
          console.error(`❌ Failed to update product ${issue.id}:`, error.message);
          errorCount++;
        } else {
          successCount++;
        }
      }

      console.log(`\n✅ Successfully updated: ${successCount} products`);
      if (errorCount > 0) {
        console.log(`❌ Failed to update: ${errorCount} products`);
      }
    } else {
      // Show first 5 examples
      console.log('\n📝 Example issues (first 5):');
      issues.slice(0, 5).forEach((issue, index) => {
        console.log(`\n${index + 1}. Product ID: ${issue.id}`);
        console.log(`   Issue: ${issue.issue}`);
        console.log(`   Original: ${issue.originalUrl.substring(0, 80)}...`);
        console.log(`   Fixed:    ${issue.fixedUrl?.substring(0, 80)}...`);
      });
    }
  }

  console.log('\n✨ Validation complete!\n');
}

// Validate other merchants (Walmart, Wayfair, etc.)
async function validateOtherMerchants() {
  console.log('\n🔍 Checking other merchant links...\n');

  const { data: products, error } = await supabase
    .from('products')
    .select('id, product_url, merchant')
    .neq('merchant', 'Amazon')
    .not('product_url', 'is', null);

  if (error) {
    console.error('❌ Error fetching products:', error);
    return;
  }

  if (!products || products.length === 0) {
    console.log('ℹ️  No non-Amazon products found');
    return;
  }

  const merchantCounts = products.reduce((acc, p) => {
    acc[p.merchant] = (acc[p.merchant] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('📊 Other merchants:');
  Object.entries(merchantCounts).forEach(([merchant, count]) => {
    console.log(`   - ${merchant}: ${count} products`);
  });

  // Check for broken links (basic validation)
  const invalidUrls = products.filter(p => {
    const url = p.product_url;
    return !url.startsWith('http://') && !url.startsWith('https://');
  });

  if (invalidUrls.length > 0) {
    console.log(`\n⚠️  Found ${invalidUrls.length} products with invalid URLs (not starting with http/https)`);
  }

  console.log('\n✨ Other merchant validation complete!\n');
}

// Main execution
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Homable Affiliate Link Validation Tool');
  console.log('═══════════════════════════════════════════════════════\n');

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
    console.log('   Set it with: export SUPABASE_SERVICE_ROLE_KEY=your_key_here\n');
    process.exit(1);
  }

  await validateAllAffiliateLinks();
  await validateOtherMerchants();

  console.log('═══════════════════════════════════════════════════════');
  console.log('  Done!');
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(console.error);