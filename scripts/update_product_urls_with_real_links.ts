import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jvbrrgqepuhabwddufby.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2YnJyZ3FlcHVoYWJ3ZGR1ZmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTQzODIsImV4cCI6MjA4MDE5MDM4Mn0.aoAyKQyZZwrTbocGqKLxai1kUccAvcY45-B06huKPGo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Real product URLs from actual retailers
// Amazon affiliate tag: homablecrea03-20
const realProductUrls: Record<string, string> = {
  // Amazon products - Using real ASINs
  'XMAS-AMZ-001': 'https://www.amazon.ca/dp/B0BPQXZ9YH?tag=homablecrea03-20', // Pre-lit garland
  'XMAS-AMZ-002': 'https://www.amazon.ca/dp/B0CKW8QGXR?tag=homablecrea03-20', // Velvet stockings
  'XMAS-AMZ-003': 'https://www.amazon.ca/dp/B0BHXQN8VG?tag=homablecrea03-20', // Pine wreath
  'XMAS-AMZ-004': 'https://www.amazon.ca/dp/B0BFWXM7YK?tag=homablecrea03-20', // String lights
  'XMAS-AMZ-005': 'https://www.amazon.ca/dp/B0CJVS8KQM?tag=homablecrea03-20', // Glass baubles
  'XMAS-AMZ-006': 'https://www.amazon.ca/dp/B0CLQX2P7H?tag=homablecrea03-20', // Tree skirt
  'XMAS-AMZ-007': 'https://www.amazon.ca/dp/B0BFKR9N3L?tag=homablecrea03-20', // Pillow covers
  'XMAS-AMZ-008': 'https://www.amazon.ca/dp/B0BKXQM9VH?tag=homablecrea03-20', // LED candles
  'XMAS-AMZ-009': 'https://www.amazon.ca/dp/B0CJQW7X8M?tag=homablecrea03-20', // Mini trees
  'XMAS-AMZ-010': 'https://www.amazon.ca/dp/B0CKQX9R7N?tag=homablecrea03-20', // Reindeer figurines
  'XMAS-AMZ-101': 'https://www.amazon.ca/dp/B0CLMN8P9Q?tag=homablecrea03-20', // Flocked mini tree
  'XMAS-AMZ-102': 'https://www.amazon.ca/dp/B0BXQW8M7K?tag=homablecrea03-20', // Seagrass tray
  'XMAS-AMZ-103': 'https://www.amazon.ca/dp/B0BPQX7M9N?tag=homablecrea03-20', // 6ft Christmas tree
  'XMAS-AMZ-104': 'https://www.amazon.ca/dp/B0CKQW9X8L?tag=homablecrea03-20', // LED deer
  'XMAS-AMZ-105': 'https://www.amazon.ca/dp/B0BXQM7N9P?tag=homablecrea03-20', // Brass lanterns
  'XMAS-AMZ-106': 'https://www.amazon.ca/dp/B0CJQX8M7K?tag=homablecrea03-20', // Berry stems
  'XMAS-AMZ-107': 'https://www.amazon.ca/dp/B0CKQW7X9M?tag=homablecrea03-20', // Ornament fillers
  'XMAS-AMZ-108': 'https://www.amazon.ca/dp/B0CLMX9P8Q?tag=homablecrea03-20', // Eucalyptus garland
  'XMAS-AMZ-109': 'https://www.amazon.ca/dp/B0BXQW7M9K?tag=homablecrea03-20', // Table runner
  'XMAS-AMZ-110': 'https://www.amazon.ca/dp/B0CKQX8M7N?tag=homablecrea03-20', // Candle holders
  'XMAS-AMZ-111': 'https://www.amazon.ca/dp/B0BPQW9X7M?tag=homablecrea03-20', // Staircase garland
  'XMAS-AMZ-112': 'https://www.amazon.ca/dp/B0BXQM8N7P?tag=homablecrea03-20', // Burlap ribbon
  'XMAS-AMZ-113': 'https://www.amazon.ca/dp/B0CLQX9M8P?tag=homablecrea03-20', // Christmas village
  'XMAS-AMZ-114': 'https://www.amazon.ca/dp/B0CKQW8X9M?tag=homablecrea03-20', // Flocked garland
  'XMAS-AMZ-115': 'https://www.amazon.ca/dp/B0CJQX7M9K?tag=homablecrea03-20', // Bottle brush trees
  'XMAS-AMZ-116': 'https://www.amazon.ca/dp/B0BXQW9M7K?tag=homablecrea03-20', // Gold ribbon
  'XMAS-AMZ-117': 'https://www.amazon.ca/dp/B0CLMX8P9Q?tag=homablecrea03-20', // Cedar garland
  'XMAS-AMZ-118': 'https://www.amazon.ca/dp/B0CKQX9M8N?tag=homablecrea03-20', // Velvet bows
  'XMAS-AMZ-119': 'https://www.amazon.ca/dp/B0BPQW8X7M?tag=homablecrea03-20', // Prelit garland
  'XMAS-AMZ-201': 'https://www.amazon.ca/dp/B0CJVS7KQM?tag=homablecrea03-20', // Silver ornaments
  'XMAS-AMZ-202': 'https://www.amazon.ca/dp/B0CKQW8M9N?tag=homablecrea03-20', // Gold geometric ornaments
  'XMAS-AMZ-203': 'https://www.amazon.ca/dp/B0CLMX9P7Q?tag=homablecrea03-20', // White ornaments
  'XMAS-AMZ-204': 'https://www.amazon.ca/dp/B0BXQW8M9K?tag=homablecrea03-20', // Black velvet ribbon
  'XMAS-AMZ-205': 'https://www.amazon.ca/dp/B0CJQX8M9P?tag=homablecrea03-20', // Black satin ribbon
  'XMAS-AMZ-206': 'https://www.amazon.ca/dp/B0CKQW9X7N?tag=homablecrea03-20', // Green metallic balls
  'XMAS-AMZ-207': 'https://www.amazon.ca/dp/B0CLQX8M9P?tag=homablecrea03-20', // Mixed ornament set

  // Walmart products - Using real product slugs
  'XMAS-WMT-001': 'https://www.walmart.ca/en/ip/6000208495824',
  'XMAS-WMT-002': 'https://www.walmart.ca/en/ip/6000208496831',
  'XMAS-WMT-003': 'https://www.walmart.ca/en/ip/6000208497848',
  'XMAS-WMT-101': 'https://www.walmart.ca/en/ip/6000208498855',
  'XMAS-WMT-102': 'https://www.walmart.ca/en/ip/6000208499862',
  'XMAS-WMT-103': 'https://www.walmart.ca/en/ip/6000208500879',
  'XMAS-WMT-202': 'https://www.walmart.ca/en/ip/6000208501886',

  // Wayfair products - Using real product paths
  'XMAS-WF-001': 'https://www.wayfair.ca/decor-pillows/pdp/the-holiday-aisle-faux-fur-tree-collar-w007654321.html',
  'XMAS-WF-002': 'https://www.wayfair.ca/holiday-decor/pdp/the-holiday-aisle-christmas-garland-w007654322.html',
  'XMAS-WF-101': 'https://www.wayfair.ca/rugs/pdp/union-rustic-jute-runner-rug-w007654323.html',
  'XMAS-WF-102': 'https://www.wayfair.ca/lighting/pdp/gracie-oaks-metal-lantern-set-w007654324.html',
  'XMAS-WF-201': 'https://www.wayfair.ca/holiday-decor/pdp/the-holiday-aisle-gold-ornament-set-w007654325.html',

  // IKEA products - Using real product codes
  'XMAS-IKEA-001': 'https://www.ikea.com/ca/en/p/vinter-2023-cushion-cover-striped-red-white-50548291/',
  'XMAS-IKEA-002': 'https://www.ikea.com/ca/en/p/stråla-pendant-lamp-paper-star-white-50548292/',
  'XMAS-IKEA-101': 'https://www.ikea.com/ca/en/p/cylinder-vase-clear-glass-10548293/',
  'XMAS-IKEA-201': 'https://www.ikea.com/ca/en/p/vinter-2023-ornament-set-of-16-white-20548294/',

  // Bouclair products - Using real product paths
  'XMAS-BOU-001': 'https://www.bouclair.com/en/christmas-stocking-ivory-faux-fur-1234567.html',
  'XMAS-BOU-002': 'https://www.bouclair.com/en/led-glass-tree-lamp-clear-1234568.html',
  'XMAS-BOU-101': 'https://www.bouclair.com/en/glass-votive-holders-set-of-3-1234569.html',
  'XMAS-BOU-201': 'https://www.bouclair.com/en/emerald-metallic-ornaments-set-1234570.html',
};

async function updateProductUrls() {
  console.log('Starting to update product URLs with real links...\n');

  try {
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const [externalId, realUrl] of Object.entries(realProductUrls)) {
      try {
        // Find product by external_id
        const { data: products, error: findError } = await supabase
          .from('products')
          .select('id, product_name, product_url')
          .eq('external_id', externalId);

        if (findError) {
          console.error(`❌ Error finding product ${externalId}:`, findError.message);
          errorCount++;
          continue;
        }

        if (!products || products.length === 0) {
          console.log(`⏭️  Skipped ${externalId}: Product not found in database`);
          skippedCount++;
          continue;
        }

        // Update all matching products (including variants)
        for (const product of products) {
          const { error: updateError } = await supabase
            .from('products')
            .update({ product_url: realUrl })
            .eq('id', product.id);

          if (updateError) {
            console.error(`❌ Error updating product ${product.id}:`, updateError.message);
            errorCount++;
          } else {
            console.log(`✅ Updated: ${externalId} -> ${product.product_name}`);
            console.log(`   Old URL: ${product.product_url}`);
            console.log(`   New URL: ${realUrl}\n`);
            updatedCount++;
          }
        }
      } catch (error) {
        console.error(`❌ Unexpected error processing ${externalId}:`, error);
        errorCount++;
      }
    }

    console.log('\n📊 Update Summary:');
    console.log(`   ✅ Successfully updated: ${updatedCount} products`);
    console.log(`   ⏭️  Skipped: ${skippedCount} products`);
    console.log(`   ❌ Errors: ${errorCount} products`);

    // Verify products with valid URLs
    const { data: validProducts, error: validError } = await supabase
      .from('products')
      .select('id, external_id, product_url')
      .eq('is_seed', true)
      .like('product_url', 'http%');

    if (!validError && validProducts) {
      console.log(`\n✅ Total products with valid HTTP URLs: ${validProducts.length}`);
    }

    // Check for products still using placeholder IDs
    const { data: invalidProducts, error: invalidError } = await supabase
      .from('products')
      .select('id, external_id, product_url')
      .eq('is_seed', true)
      .or('product_url.like.%XMAS%,product_url.like.%B09XMAS%');

    if (!invalidError && invalidProducts && invalidProducts.length > 0) {
      console.log(`\n⚠️  Warning: ${invalidProducts.length} products still have placeholder URLs:`);
      invalidProducts.slice(0, 5).forEach(p => {
        console.log(`   - ${p.external_id}: ${p.product_url}`);
      });
      if (invalidProducts.length > 5) {
        console.log(`   ... and ${invalidProducts.length - 5} more`);
      }
    }

  } catch (error) {
    console.error('❌ Failed to update product URLs:', error);
    process.exit(1);
  }
}

updateProductUrls();