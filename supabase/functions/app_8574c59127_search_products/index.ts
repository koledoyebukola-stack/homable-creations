import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

// Amazon PA-API v5 helper functions
interface AmazonCredentials {
  accessKey: string;
  secretKey: string;
  associateTag: string;
}

interface AmazonSearchParams {
  keywords: string;
  searchIndex?: string;
  itemCount?: number;
}

async function searchAmazonProducts(
  credentials: AmazonCredentials,
  params: AmazonSearchParams
): Promise<any[]> {
  const { accessKey, secretKey, associateTag } = credentials;
  const { keywords, searchIndex = 'All', itemCount = 3 } = params;

  // Amazon PA-API v5 endpoint for Canada
  const endpoint = 'webservices.amazon.ca';
  const region = 'us-east-1'; // PA-API uses us-east-1 even for .ca
  const service = 'ProductAdvertisingAPI';
  const path = '/paapi5/searchitems';
  
  const host = endpoint;
  const method = 'POST';
  const contentType = 'application/json; charset=utf-8';
  
  // Request payload
  const payload = {
    Keywords: keywords,
    SearchIndex: searchIndex,
    ItemCount: itemCount,
    PartnerTag: associateTag,
    PartnerType: 'Associates',
    Marketplace: 'www.amazon.ca',
    Resources: [
      'Images.Primary.Large',
      'ItemInfo.Title',
      'ItemInfo.Features',
      'Offers.Listings.Price',
      'Offers.Listings.DeliveryInfo.IsPrimeEligible',
      'CustomerReviews.StarRating',
      'CustomerReviews.Count',
    ],
  };

  const payloadString = JSON.stringify(payload);

  // AWS Signature Version 4 signing
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);

  // Create canonical request
  const canonicalUri = path;
  const canonicalQuerystring = '';
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-date';
  
  // Hash the payload
  const payloadHash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(payloadString)
  );
  const payloadHashHex = Array.from(new Uint8Array(payloadHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHashHex}`;

  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  
  const canonicalRequestHash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonicalRequest)
  );
  const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHashHex}`;

  // Calculate signature
  const kDate = await hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = await hmacSha256(kSigning, stringToSign);
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Create authorization header
  const authorizationHeader = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`;

  // Make the request
  const response = await fetch(`https://${host}${path}`, {
    method: method,
    headers: {
      'Content-Type': contentType,
      'X-Amz-Date': amzDate,
      'Authorization': authorizationHeader,
    },
    body: payloadString,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Amazon API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result.SearchResult?.Items || [];
}

async function hmacSha256(key: string | ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const keyData = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

function mapSearchIndexFromCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    'Seating': 'Furniture',
    'Tables': 'Furniture',
    'Storage': 'Furniture',
    'Lighting': 'Lighting',
    'Rugs': 'HomeAndKitchen',
    'Decor': 'HomeAndKitchen',
  };
  return categoryMap[category] || 'All';
}

function buildAmazonProductUrl(asin: string, associateTag: string): string {
  return `https://www.amazon.ca/dp/${asin}?tag=${associateTag}`;
}

function extractPriceFromAmazon(item: any): number {
  try {
    const price = item.Offers?.Listings?.[0]?.Price?.Amount || 0;
    return Math.round(price);
  } catch {
    return 0;
  }
}

// RELAXED category matching function
function matchesCategory(itemName: string, itemCategory: string, productCategory: string, requestId: string): boolean {
  const itemLower = itemName.toLowerCase();
  const itemCatLower = itemCategory.toLowerCase();
  const prodCatLower = productCategory.toLowerCase();
  
  console.log(`[${requestId}] Matching: item="${itemName}" (${itemCategory}) vs product category="${productCategory}"`);
  
  // Define EXPANDED category groups for very broad matching
  const categoryGroups: Record<string, string[]> = {
    'seating': ['sofa', 'couch', 'sectional', 'loveseat', 'chair', 'armchair', 'recliner', 'bench', 'ottoman', 'stool'],
    'table': ['table', 'console', 'desk', 'nightstand', 'end table', 'side table', 'coffee table', 'accent table', 'accent_table'],
    'tree': ['christmas tree', 'tree', 'artificial tree', 'pine tree', 'fir tree'],
    'garland': ['garland', 'wreath', 'greenery', 'swag', 'vine'],
    'ornament': ['ornament', 'decoration', 'bauble', 'christmas ball', 'hanging decor'],
    'lighting': ['candle', 'lantern', 'light', 'lamp', 'candleholder', 'candle holder', 'string lights'],
    'textile': ['pillow', 'cushion', 'throw', 'blanket', 'rug', 'carpet', 'curtain'],
    'decor': ['vase', 'mirror', 'picture frame', 'wall art', 'sculpture', 'figurine', 'bowl', 'tray', 'basket', 'decoration'],
  };
  
  // Check if item and product belong to the same category group
  for (const [group, keywords] of Object.entries(categoryGroups)) {
    const itemInGroup = keywords.some(kw => itemLower.includes(kw) || itemCatLower.includes(kw));
    const prodInGroup = keywords.some(kw => prodCatLower.includes(kw));
    
    if (itemInGroup && prodInGroup) {
      console.log(`[${requestId}] ✓ Match found via category group: ${group}`);
      return true;
    }
  }
  
  // RELAXED: If product is generic "decor", match with most furniture/decor items
  if (prodCatLower === 'decor') {
    const genericDecorItems = ['furniture', 'decoration', 'accent', 'home', 'interior'];
    if (genericDecorItems.some(kw => itemLower.includes(kw) || itemCatLower.includes(kw))) {
      console.log(`[${requestId}] ✓ Match found: product is generic decor`);
      return true;
    }
  }
  
  // Direct category match
  if (itemCatLower === prodCatLower) {
    console.log(`[${requestId}] ✓ Match found: exact category match`);
    return true;
  }
  
  // VERY RELAXED: Partial word matching
  const itemWords = itemCatLower.split(/\s+/);
  const prodWords = prodCatLower.split(/\s+/);
  for (const itemWord of itemWords) {
    for (const prodWord of prodWords) {
      if (itemWord.length > 3 && prodWord.length > 3 && 
          (itemWord.includes(prodWord) || prodWord.includes(itemWord))) {
        console.log(`[${requestId}] ✓ Match found: partial word match "${itemWord}" ↔ "${prodWord}"`);
        return true;
      }
    }
  }
  
  console.log(`[${requestId}] ✗ No match found`);
  return false;
}

// GUARANTEED to return at least 3 products (or all available if less than 3 exist)
async function searchSeedProducts(
  supabase: any,
  detectedItem: any,
  requestId: string
): Promise<any[]> {
  console.log(`[${requestId}] ═══════════════════════════════════════════════════`);
  console.log(`[${requestId}] SEARCHING SEED PRODUCTS`);
  console.log(`[${requestId}] Detected item: "${detectedItem.item_name}"`);
  console.log(`[${requestId}] Category: "${detectedItem.category}"`);
  console.log(`[${requestId}] Style: "${detectedItem.style}"`);
  console.log(`[${requestId}] Color: "${detectedItem.dominant_color}"`);
  console.log(`[${requestId}] ═══════════════════════════════════════════════════`);
  
  // Fetch ALL seed products (no category filter)
  const { data: allSeedProducts, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_seed', true)
    .limit(100);

  if (error) {
    console.error(`[${requestId}] Error fetching seed products:`, error);
    return [];
  }

  if (!allSeedProducts || allSeedProducts.length === 0) {
    console.log(`[${requestId}] ✗ No seed products found in database`);
    return [];
  }

  console.log(`[${requestId}] Found ${allSeedProducts.length} total seed products in database`);
  console.log(`[${requestId}] Seed product categories:`, [...new Set(allSeedProducts.map((p: any) => p.category))]);

  // Filter products using RELAXED matching
  const matchingProducts = allSeedProducts.filter((product: any) => {
    return matchesCategory(
      detectedItem.item_name,
      detectedItem.category,
      product.category || '',
      requestId
    );
  });

  console.log(`[${requestId}] After relaxed matching: ${matchingProducts.length} products matched`);

  // Build search terms from detected item
  const searchTerms = [
    detectedItem.item_name?.toLowerCase(),
    detectedItem.style?.toLowerCase(),
    detectedItem.dominant_color?.toLowerCase(),
    ...(detectedItem.tags || []).map((t: string) => t.toLowerCase()),
  ].filter(Boolean);

  console.log(`[${requestId}] Scoring products with search terms:`, searchTerms);

  let productsToReturn: any[] = [];

  // If we have matching products, score and select them
  if (matchingProducts.length > 0) {
    // Score each matching product
    const scoredProducts = matchingProducts.map((product: any) => {
      let score = 0;
      const productText = [
        product.product_name?.toLowerCase(),
        product.description?.toLowerCase(),
        product.color?.toLowerCase(),
        product.style?.toLowerCase(),
        ...(product.tags || []).map((t: string) => t.toLowerCase()),
        ...(product.materials || []).map((m: string) => m.toLowerCase()),
      ].filter(Boolean).join(' ');

      // Calculate match score based on search terms
      searchTerms.forEach((term: string) => {
        if (productText.includes(term)) {
          score += 1;
        }
      });

      // Boost score for exact category match
      if (product.category === detectedItem.category) {
        score += 2;
      }

      // Boost score for color match
      if (detectedItem.dominant_color && 
          product.color?.toLowerCase().includes(detectedItem.dominant_color.toLowerCase())) {
        score += 1.5;
      }

      // Boost score for style match
      if (detectedItem.style && 
          product.style?.toLowerCase().includes(detectedItem.style.toLowerCase())) {
        score += 1.5;
      }

      return { ...product, matchScore: score };
    });

    // Sort by score and take top products
    productsToReturn = scoredProducts
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3);

    console.log(`[${requestId}] Top ${productsToReturn.length} seed products selected:`);
    productsToReturn.forEach((p, i) => {
      console.log(`[${requestId}]   ${i + 1}. "${p.product_name}" (category: ${p.category}, score: ${p.matchScore})`);
    });
  }

  // CRITICAL: If we still don't have at least 3 products, use random fallback
  if (productsToReturn.length < 3) {
    console.log(`[${requestId}] ⚠️ Only ${productsToReturn.length} matched products found, using random seed fallback for item: "${detectedItem.item_name}"`);
    
    // Shuffle all seed products
    const shuffled = [...allSeedProducts].sort(() => 0.5 - Math.random());
    
    // Calculate how many more we need
    const needed = 3 - productsToReturn.length;
    
    // Get the product IDs we already have to avoid duplicates
    const existingIds = new Set(productsToReturn.map(p => p.id));
    
    // Add random products until we have 3 total
    const additionalProducts = shuffled
      .filter(p => !existingIds.has(p.id))
      .slice(0, needed);
    
    productsToReturn = [...productsToReturn, ...additionalProducts];
    
    console.log(`[${requestId}] Added ${additionalProducts.length} random products to reach minimum of 3`);
    console.log(`[${requestId}] Random products added:`, additionalProducts.map(p => p.product_name));
  }

  // Final guarantee: return at least 3 products (or all available if database has less than 3)
  const finalCount = Math.min(productsToReturn.length, allSeedProducts.length);
  if (finalCount < 3 && allSeedProducts.length >= 3) {
    // This should never happen, but as a last resort, just take first 3
    console.log(`[${requestId}] ⚠️ EMERGENCY FALLBACK: Taking first 3 products from database`);
    productsToReturn = allSeedProducts.slice(0, 3);
  }

  console.log(`[${requestId}] Returning ${productsToReturn.length} products for item "${detectedItem.item_name}"`);
  
  return productsToReturn;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] ═══════════════════════════════════════════════════`);
  console.log(`[${requestId}] NEW REQUEST: ${req.method} ${req.url}`);
  console.log(`[${requestId}] ═══════════════════════════════════════════════════`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] Handling OPTIONS preflight`);
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
      console.log(`[${requestId}] Request body:`, JSON.stringify(body, null, 2));
    } catch (e) {
      console.error(`[${requestId}] Failed to parse request body:`, e);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { detected_item_id } = body;

    if (!detected_item_id) {
      console.error(`[${requestId}] Missing detected_item_id in body:`, body);
      return new Response(
        JSON.stringify({ error: 'detected_item_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[${requestId}] Processing detected_item_id: ${detected_item_id}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the detected item details
    const { data: detectedItem, error: itemError } = await supabase
      .from('detected_items')
      .select('*')
      .eq('id', detected_item_id)
      .single();

    if (itemError || !detectedItem) {
      console.error(`[${requestId}] Error fetching detected item:`, itemError);
      throw new Error('Detected item not found');
    }

    console.log(`[${requestId}] Detected item details:`, {
      id: detectedItem.id,
      item_name: detectedItem.item_name,
      category: detectedItem.category,
      style: detectedItem.style,
      dominant_color: detectedItem.dominant_color,
      materials: detectedItem.materials,
      tags: detectedItem.tags,
    });

    // Check if products already exist for this detected_item_id via item_product_matches
    const { data: existingMatches, error: fetchError } = await supabase
      .from('item_product_matches')
      .select(`
        match_score,
        is_top_pick,
        products (*)
      `)
      .eq('detected_item_id', detected_item_id);

    if (fetchError) {
      console.error(
        `[${requestId}] Error fetching existing matches:`,
        fetchError
      );
    }

    // If products already exist, return them
    if (existingMatches && existingMatches.length > 0) {
      console.log(
        `[${requestId}] ✓ Returning ${existingMatches.length} existing products (cached)`
      );
      const products = existingMatches.map((match: any) => ({
        ...match.products,
        match_score: match.match_score,
        is_top_pick: match.is_top_pick,
      }));
      console.log(`[${requestId}] Returning ${products.length} products for item "${detectedItem.item_name}"`);
      return new Response(
        JSON.stringify({ products }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check for Amazon credentials
    const amazonAccessKey = Deno.env.get('AMAZON_PA_API_ACCESS_KEY');
    const amazonSecretKey = Deno.env.get('AMAZON_PA_API_SECRET_KEY');
    const amazonAssociateTag = Deno.env.get('AMAZON_ASSOCIATE_TAG');

    let productsToInsert: any[] = [];
    let useAmazon = false;

    // Try Amazon first if credentials are available
    if (amazonAccessKey && amazonSecretKey && amazonAssociateTag) {
      console.log(`[${requestId}] Amazon credentials found, searching Amazon.ca`);
      useAmazon = true;

      try {
        // Build keyword string from detected item attributes
        const keywords = [
          detectedItem.style,
          detectedItem.dominant_color,
          detectedItem.item_name,
        ]
          .filter(Boolean)
          .join(' ');

        console.log(`[${requestId}] Amazon search keywords: "${keywords}"`);

        const searchIndex = mapSearchIndexFromCategory(detectedItem.category);
        console.log(`[${requestId}] Using search index: ${searchIndex}`);

        const amazonItems = await searchAmazonProducts(
          {
            accessKey: amazonAccessKey,
            secretKey: amazonSecretKey,
            associateTag: amazonAssociateTag,
          },
          {
            keywords,
            searchIndex,
            itemCount: 3,
          }
        );

        console.log(`[${requestId}] Amazon returned ${amazonItems.length} items`);

        // Map Amazon items to our product schema
        productsToInsert = amazonItems.map((item: any) => {
          const asin = item.ASIN;
          const title = item.ItemInfo?.Title?.DisplayValue || 'Amazon Product';
          const price = extractPriceFromAmazon(item);
          const imageUrl = item.Images?.Primary?.Large?.URL || '';
          const rating = item.CustomerReviews?.StarRating?.Value || null;
          const reviewCount = item.CustomerReviews?.Count || null;
          const isPrime = item.Offers?.Listings?.[0]?.DeliveryInfo?.IsPrimeEligible || false;

          return {
            external_id: asin,
            merchant: 'Amazon',
            product_name: title,
            category: detectedItem.category,
            price: price,
            currency: 'CAD',
            image_url: imageUrl,
            product_url: buildAmazonProductUrl(asin, amazonAssociateTag),
            description: item.ItemInfo?.Features?.DisplayValues?.[0] || '',
            color: detectedItem.dominant_color,
            materials: detectedItem.materials || [],
            style: detectedItem.style,
            tags: detectedItem.tags || [],
            rating: rating ? parseFloat(rating) : null,
            review_count: reviewCount,
            shipping_info: isPrime ? 'Prime eligible' : null,
            availability: 'in_stock',
          };
        });

        if (productsToInsert.length === 0) {
          console.log(`[${requestId}] Amazon returned no results, falling back to seed products`);
          useAmazon = false;
        }
      } catch (amazonError) {
        console.error(`[${requestId}] Amazon API error:`, amazonError);
        console.log(`[${requestId}] Falling back to seed products`);
        useAmazon = false;
      }
    } else {
      console.log(`[${requestId}] Amazon credentials not configured, using seed products`);
    }

    // Fallback to seed products if Amazon didn't work
    if (!useAmazon || productsToInsert.length === 0) {
      console.log(`[${requestId}] Using seed products as fallback`);
      
      const seedProducts = await searchSeedProducts(supabase, detectedItem, requestId);
      
      if (seedProducts.length > 0) {
        // Use seed products directly (they're already in the database)
        // We just need to create matches
        console.log(`[${requestId}] ✓ Found ${seedProducts.length} matching seed products`);
        
        // Create item_product_matches for seed products
        const matches = seedProducts.map((product, index) => ({
          detected_item_id: detected_item_id,
          product_id: product.id,
          match_score: 0.95 - index * 0.07,
          is_top_pick: index === 0,
        }));

        const { error: matchError } = await supabase
          .from('item_product_matches')
          .insert(matches);

        if (matchError) {
          console.error(`[${requestId}] Error creating seed product matches:`, matchError);
        } else {
          console.log(`[${requestId}] ✓ Created ${matches.length} seed product matches`);
        }

        // Return seed products with match scores
        const productsWithScores = seedProducts.map((product, index) => ({
          ...product,
          match_score: matches[index].match_score,
          is_top_pick: matches[index].is_top_pick,
        }));

        console.log(`[${requestId}] ✓ Returning ${productsWithScores.length} seed products for item "${detectedItem.item_name}"`);
        return new Response(
          JSON.stringify({ products: productsWithScores }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } else {
        console.log(`[${requestId}] ✗ No seed products found, returning empty result`);
        return new Response(
          JSON.stringify({ products: [] }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    console.log(
      `[${requestId}] Inserting ${productsToInsert.length} products for "${detectedItem.item_name}" (source: Amazon)`
    );

    // Insert products into products table
    const { data: products, error: insertError } = await supabase
      .from('products')
      .insert(productsToInsert)
      .select();

    if (insertError) {
      console.error(
        `[${requestId}] Database insert error:`,
        insertError
      );
      throw insertError;
    }

    console.log(
      `[${requestId}] Successfully inserted ${products?.length} products`
    );

    // Create item_product_matches to link detected items to products
    const matches = products?.map((product, index) => ({
      detected_item_id: detected_item_id,
      product_id: product.id,
      match_score: 0.95 - index * 0.07, // Decreasing scores
      is_top_pick: index === 0,
    }));

    if (matches && matches.length > 0) {
      const { error: matchError } = await supabase
        .from('item_product_matches')
        .insert(matches);

      if (matchError) {
        console.error(
          `[${requestId}] Error creating matches:`,
          matchError
        );
      } else {
        console.log(`[${requestId}] Created ${matches.length} product matches`);
      }
    }

    // Return products with match scores
    const productsWithScores = products?.map((product, index) => ({
      ...product,
      match_score: matches?.[index]?.match_score,
      is_top_pick: matches?.[index]?.is_top_pick,
    }));

    console.log(`[${requestId}] Returning ${productsWithScores?.length || 0} products for item "${detectedItem.item_name}"`);
    
    return new Response(
      JSON.stringify({ products: productsWithScores }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error(`[${requestId}] ✗ ERROR:`, error);
    return new Response(
      JSON.stringify({ error: error.message || 'Product search failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});