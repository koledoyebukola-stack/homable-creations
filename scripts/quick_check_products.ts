import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jvbrrgqepuhabwddufby.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2YnJyZ3FlcHVoYWJ3ZGR1ZmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTQzODIsImV4cCI6MjA4MDE5MDM4Mn0.aoAyKQyZZwrTbocGqKLxai1kUccAvcY45-B06huKPGo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function quickCheck() {
  console.log('Fetching sample products...\n');
  
  const { data, error } = await supabase
    .from('products')
    .select('id, product_name, product_url, merchant, category, external_id')
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data?.length || 0} products\n`);
  
  data?.forEach((p, i) => {
    console.log(`${i + 1}. ${p.product_name}`);
    console.log(`   Merchant: ${p.merchant}`);
    console.log(`   URL: ${p.product_url}`);
    console.log(`   External ID: ${p.external_id || 'N/A'}`);
    console.log('');
  });
}

quickCheck();