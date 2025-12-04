/**
 * Product URL Inspection Script
 * 
 * This script inspects all products in the database and validates their URLs.
 * It checks for:
 * - Valid URL format (starts with http/https)
 * - Amazon affiliate tag presence and correctness
 * - Placeholder or invalid product codes
 * - Merchant-specific URL patterns
 * 
 * Usage: npx tsx scripts/inspect_product_urls.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jvbrrgqepuhabwddufby.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2YnJyZ3FlcHVoYWJ3ZGR1ZmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTQzODIsImV4cCI6MjA4MDE5MDM4Mn0.aoAyKQyZZwrTbocGqKLxai1kUccAvcY45-B06huKPGo';

// Your Amazon.ca affiliate tag
const CORRECT_AMAZON_TAG = 'homablecrea03-20';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Product {
  id: string;
  product_name: string;
  product_url: string;
  merchant: string;
  category: string;
  external_id: string | null;
  is_seed: boolean;
}

interface ValidationIssue {
  id: string;
  product_name: string;
  merchant: string;
  category: string;
  url: string;
  issue_type: string;
  issue_description: string;
  suggested_fix: string | null;
}

function validateProductUrl(product: Product): ValidationIssue | null {
  const url = product.product_url;

  // Check 1: URL exists
  if (!url || url.trim() === '') {
    return {
      id: product.id,
      product_name: product.product_name,
      merchant: product.merchant,
      category: product.category,
      url: url || '',
      issue_type: 'MISSING_URL',
      issue_description: 'Product has no URL',
      suggested_fix: null,
    };
  }

  // Check 2: Valid URL format
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return {
      id: product.id,
      product_name: product.product_name,
      merchant: product.merchant,
      category: product.category,
      url: url,
      issue_type: 'INVALID_FORMAT',
      issue_description: 'URL does not start with http:// or https://',
      suggested_fix: url.startsWith('www.') ? `https://${url}` : null,
    };
  }

  // Check 3: Placeholder patterns
  const placeholderPatterns = [
    /XMAS/i,
    /B09XMAS/i,
    /xmas-/i,
    /placeholder/i,
    /example\.com/i,
    /test-product/i,
  ];

  for (const pattern of placeholderPatterns) {
    if (pattern.test(url)) {
      return {
        id: product.id,
        product_name: product.product_name,
        merchant: product.merchant,
        category: product.category,
        url: url,
        issue_type: 'PLACEHOLDER_URL',
        issue_description: `URL contains placeholder pattern: ${pattern.source}`,
        suggested_fix: null,
      };
    }
  }

  // Check 4: Amazon-specific validation
  if (product.merchant === 'Amazon' || url.includes('amazon.ca')) {
    // Check for affiliate tag
    const tagMatch = url.match(/[?&]tag=([^&]+)/);
    
    if (!tagMatch) {
      return {
        id: product.id,
        product_name: product.product_name,
        merchant: product.merchant,
        category: product.category,
        url: url,
        issue_type: 'MISSING_AFFILIATE_TAG',
        issue_description: 'Amazon URL missing affiliate tag',
        suggested_fix: url.includes('?') 
          ? `${url}&tag=${CORRECT_AMAZON_TAG}`
          : `${url}?tag=${CORRECT_AMAZON_TAG}`,
      };
    }

    const currentTag = tagMatch[1];
    if (currentTag !== CORRECT_AMAZON_TAG) {
      return {
        id: product.id,
        product_name: product.product_name,
        merchant: product.merchant,
        category: product.category,
        url: url,
        issue_type: 'WRONG_AFFILIATE_TAG',
        issue_description: `Amazon URL has wrong tag: ${currentTag} (expected: ${CORRECT_AMAZON_TAG})`,
        suggested_fix: url.replace(/tag=[^&]+/, `tag=${CORRECT_AMAZON_TAG}`),
      };
    }

    // Check for valid ASIN format
    const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
    if (!asinMatch) {
      return {
        id: product.id,
        product_name: product.product_name,
        merchant: product.merchant,
        category: product.category,
        url: url,
        issue_type: 'INVALID_ASIN',
        issue_description: 'Amazon URL does not contain valid ASIN format (/dp/[10 chars])',
        suggested_fix: null,
      };
    }
  }

  // Check 5: Walmart-specific validation
  if (product.merchant === 'Walmart' || url.includes('walmart.ca')) {
    if (!url.includes('walmart.ca')) {
      return {
        id: product.id,
        product_name: product.product_name,
        merchant: product.merchant,
        category: product.category,
        url: url,
        issue_type: 'WRONG_DOMAIN',
        issue_description: 'Walmart product should use walmart.ca domain',
        suggested_fix: null,
      };
    }
  }

  // Check 6: Wayfair-specific validation
  if (product.merchant === 'Wayfair' || url.includes('wayfair.ca')) {
    if (!url.includes('wayfair.ca')) {
      return {
        id: product.id,
        product_name: product.product_name,
        merchant: product.merchant,
        category: product.category,
        url: url,
        issue_type: 'WRONG_DOMAIN',
        issue_description: 'Wayfair product should use wayfair.ca domain',
        suggested_fix: null,
      };
    }
  }

  // URL is valid
  return null;
}

async function inspectAllProducts() {
  console.log('🔍 Starting product URL inspection...\n');
  console.log(`Expected Amazon affiliate tag: ${CORRECT_AMAZON_TAG}\n`);

  // Fetch all products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, product_name, product_url, merchant, category, external_id, is_seed')
    .order('merchant', { ascending: true });

  if (error) {
    console.error('❌ Error fetching products:', error);
    return;
  }

  if (!products || products.length === 0) {
    console.log('ℹ️  No products found in database');
    return;
  }

  console.log(`📊 Found ${products.length} products to inspect\n`);

  // Validate each product
  const issues: ValidationIssue[] = [];
  const validProducts: Product[] = [];

  for (const product of products) {
    const issue = validateProductUrl(product);
    if (issue) {
      issues.push(issue);
    } else {
      validProducts.push(product);
    }
  }

  // Generate report
  console.log('═══════════════════════════════════════════════════════');
  console.log('  INSPECTION RESULTS');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`✅ Valid products: ${validProducts.length}`);
  console.log(`⚠️  Products with issues: ${issues.length}\n`);

  if (issues.length > 0) {
    // Group issues by type
    const issuesByType = issues.reduce((acc, issue) => {
      if (!acc[issue.issue_type]) {
        acc[issue.issue_type] = [];
      }
      acc[issue.issue_type].push(issue);
      return acc;
    }, {} as Record<string, ValidationIssue[]>);

    console.log('📋 Issues by Type:\n');
    
    Object.entries(issuesByType).forEach(([type, typeIssues]) => {
      console.log(`\n🔸 ${type} (${typeIssues.length} products)`);
      console.log('─'.repeat(60));
      
      typeIssues.slice(0, 3).forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.product_name}`);
        console.log(`   Merchant: ${issue.merchant} | Category: ${issue.category}`);
        console.log(`   Issue: ${issue.issue_description}`);
        console.log(`   Current URL: ${issue.url.substring(0, 80)}${issue.url.length > 80 ? '...' : ''}`);
        if (issue.suggested_fix) {
          console.log(`   Suggested Fix: ${issue.suggested_fix.substring(0, 80)}${issue.suggested_fix.length > 80 ? '...' : ''}`);
        }
      });
      
      if (typeIssues.length > 3) {
        console.log(`\n   ... and ${typeIssues.length - 3} more`);
      }
    });
  }

  // Merchant breakdown
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('  MERCHANT BREAKDOWN');
  console.log('═══════════════════════════════════════════════════════\n');

  const merchantStats = products.reduce((acc, product) => {
    const merchant = product.merchant || 'Unknown';
    if (!acc[merchant]) {
      acc[merchant] = { total: 0, valid: 0, issues: 0, seed: 0, api: 0 };
    }
    acc[merchant].total++;
    if (product.is_seed) {
      acc[merchant].seed++;
    } else {
      acc[merchant].api++;
    }
    
    const hasIssue = issues.some(i => i.id === product.id);
    if (hasIssue) {
      acc[merchant].issues++;
    } else {
      acc[merchant].valid++;
    }
    return acc;
  }, {} as Record<string, { total: number; valid: number; issues: number; seed: number; api: number }>);

  Object.entries(merchantStats).forEach(([merchant, stats]) => {
    console.log(`${merchant}:`);
    console.log(`  Total: ${stats.total} products`);
    console.log(`  Valid: ${stats.valid} (${Math.round(stats.valid / stats.total * 100)}%)`);
    console.log(`  Issues: ${stats.issues} (${Math.round(stats.issues / stats.total * 100)}%)`);
    console.log(`  Seed: ${stats.seed} | API: ${stats.api}\n`);
  });

  // Export issues to JSON for further processing
  if (issues.length > 0) {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  EXPORT OPTIONS');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('💾 To export issues to JSON:');
    console.log('   npx tsx scripts/inspect_product_urls.ts > product_issues.json\n');
    
    console.log('🔧 To fix issues automatically:');
    console.log('   1. Review the issues above');
    console.log('   2. Run: npx tsx scripts/fix_product_urls.ts\n');
  }

  console.log('✨ Inspection complete!\n');

  // Return issues for programmatic use
  return {
    total: products.length,
    valid: validProducts.length,
    issues: issues.length,
    issuesByType: issues.reduce((acc, issue) => {
      if (!acc[issue.issue_type]) {
        acc[issue.issue_type] = [];
      }
      acc[issue.issue_type].push(issue);
      return acc;
    }, {} as Record<string, ValidationIssue[]>),
    allIssues: issues,
  };
}

// Main execution
if (import.meta.main) {
  inspectAllProducts().catch(console.error);
}

export { inspectAllProducts, validateProductUrl };