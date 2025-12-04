import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jvbrrgqepuhabwddufby.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2YnJyZ3FlcHVoYWJ3ZGR1ZmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTQzODIsImV4cCI6MjA4MDE5MDM4Mn0.aoAyKQyZZwrTbocGqKLxai1kUccAvcY45-B06huKPGo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function updateAllVariantUrls() {
  console.log('Starting to update all variant product URLs...\n');

  try {
    // Get all products with valid URLs (base products)
    const { data: validProducts, error: validError } = await supabase
      .from('products')
      .select('external_id, product_url')
      .eq('is_seed', true)
      .like('product_url', 'http%')
      .not('product_url', 'like', '%XMAS%')
      .not('product_url', 'like', '%B09XMAS%');

    if (validError) {
      console.error('Error fetching valid products:', validError);
      return;
    }

    if (!validProducts || validProducts.length === 0) {
      console.log('No valid products found to use as reference.');
      return;
    }

    console.log(`Found ${validProducts.length} products with valid URLs\n`);

    let updatedCount = 0;
    let errorCount = 0;

    // For each valid product, find and update its variants
    for (const validProduct of validProducts) {
      const baseExternalId = validProduct.external_id;
      const validUrl = validProduct.product_url;

      // Find all variants of this product (external_id starts with base + hyphen)
      const variantPatterns = [
        `${baseExternalId}-CLR1`,
        `${baseExternalId}-SZ1`,
        `${baseExternalId}-PREM`,
        `${baseExternalId}-BDL`,
      ];

      for (const variantPattern of variantPatterns) {
        const { data: variants, error: findError } = await supabase
          .from('products')
          .select('id, external_id, product_url')
          .eq('external_id', variantPattern);

        if (findError) {
          console.error(`Error finding variants for ${variantPattern}:`, findError.message);
          errorCount++;
          continue;
        }

        if (variants && variants.length > 0) {
          for (const variant of variants) {
            // Only update if the variant has a placeholder URL
            if (variant.product_url.includes('XMAS') || variant.product_url.includes('B09XMAS')) {
              const { error: updateError } = await supabase
                .from('products')
                .update({ product_url: validUrl })
                .eq('id', variant.id);

              if (updateError) {
                console.error(`❌ Error updating variant ${variant.external_id}:`, updateError.message);
                errorCount++;
              } else {
                console.log(`✅ Updated variant: ${variant.external_id} -> ${validUrl}`);
                updatedCount++;
              }
            }
          }
        }
      }
    }

    console.log('\n📊 Variant Update Summary:');
    console.log(`   ✅ Successfully updated: ${updatedCount} variant products`);
    console.log(`   ❌ Errors: ${errorCount} products`);

    // Final verification
    const { data: remainingInvalid, error: checkError } = await supabase
      .from('products')
      .select('id, external_id, product_url')
      .eq('is_seed', true)
      .or('product_url.like.%XMAS%,product_url.like.%B09XMAS%');

    if (!checkError && remainingInvalid) {
      console.log(`\n📈 Remaining products with placeholder URLs: ${remainingInvalid.length}`);
      
      if (remainingInvalid.length > 0) {
        console.log('\nSample of remaining issues:');
        remainingInvalid.slice(0, 10).forEach(p => {
          console.log(`   - ${p.external_id}: ${p.product_url}`);
        });
      } else {
        console.log('✅ All products now have valid URLs!');
      }
    }

    // Count total valid products
    const { count: validCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_seed', true)
      .like('product_url', 'http%')
      .not('product_url', 'like', '%XMAS%')
      .not('product_url', 'like', '%B09XMAS%');

    console.log(`\n✅ Total products with valid URLs: ${validCount}/178`);

  } catch (error) {
    console.error('❌ Failed to update variant URLs:', error);
    process.exit(1);
  }
}

updateAllVariantUrls();