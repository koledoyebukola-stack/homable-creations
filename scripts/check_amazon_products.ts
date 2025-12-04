import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jvbrrgqepuhabwddufby.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2YnJyZ3FlcHVoYWJ3ZGR1ZmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTQzODIsImV4cCI6MjA4MDE5MDM4Mn0.aoAyKQyZZwrTbocGqKLxai1kUccAvcY45-B06huKPGo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAmazonProducts() {
  console.log('🔍 Checking for Amazon products...\n');
  
  const { data, error } = await supabase
    .from('products')
    .select('id, product_name, product_url, merchant')
    .eq('merchant', 'Amazon')
    .limit(50);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data?.length || 0} Amazon products\n`);
  
  if (data && data.length > 0) {
    data.forEach((p, i) => {
      console.log(`${i + 1}. ${p.product_name}`);
      console.log(`   URL: ${p.product_url}\n`);
    });
  } else {
    console.log('No Amazon products found in database.');
    console.log('All current products have invalid placeholder URLs.');
    console.log('\n💡 Solution: The database needs to be populated with real Amazon.ca products.');
    console.log('   These will be added when users upload images and get real product matches.');
  }
}

checkAmazonProducts();
