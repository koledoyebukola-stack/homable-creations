/**
 * Delete Invalid Products Script
 * 
 * This script deletes all products with invalid URLs that are just domain names.
 * These products cannot be used and will cause 404 errors.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jvbrrgqepuhabwddufby.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2YnJyZ3FlcHVoYWJ3ZGR1ZmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTQzODIsImV4cCI6MjA4MDE5MDM4Mn0.aoAyKQyZZwrTbocGqKLxai1kUccAvcY45-B06huKPGo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function deleteInvalidProducts() {
  console.log('🗑️  Deleting products with invalid URLs...\n');

  // Delete products where URL is just a domain name
  const invalidDomains = [
    'https://www.wayfair.com',
    'https://www.westelm.com', 
    'https://www.ikea.com',
    'https://www.walmart.com',
    'https://www.walmart.ca',
    'https://www.wayfair.ca',
  ];

  for (const domain of invalidDomains) {
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('product_url', domain)
      .select();

    if (error) {
      console.error(`❌ Error deleting ${domain}:`, error);
    } else {
      console.log(`✅ Deleted ${data?.length || 0} products with URL: ${domain}`);
    }
  }

  // Check remaining products
  const { data: remaining } = await supabase
    .from('products')
    .select('id, product_name, product_url, merchant')
    .limit(10);

  console.log(`\n📊 Sample of remaining products (${remaining?.length || 0}):\n`);
  remaining?.forEach((p, i) => {
    console.log(`${i + 1}. ${p.product_name}`);
    console.log(`   Merchant: ${p.merchant}`);
    console.log(`   URL: ${p.product_url}\n`);
  });
}

deleteInvalidProducts().catch(console.error);