import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  detected_item_id: string;
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Request received:`, req.method);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const body = (await req.json()) as SearchRequest;
    console.log(`[${requestId}] Searching products for item:`, body.detected_item_id);

    // Get the detected item
    const { data: items, error: itemError } = await supabase
      .from('detected_items')
      .select('*')
      .eq('id', body.detected_item_id);

    if (itemError || !items || items.length === 0) {
      throw new Error('Detected item not found');
    }

    const item = items[0];
    console.log(`[${requestId}] Item details:`, item.item_name, item.category);

    // Check if products already exist for this item
    const { data: existingMatches } = await supabase
      .from('item_product_matches')
      .select(`
        *,
        products (*)
      `)
      .eq('detected_item_id', body.detected_item_id);

    if (existingMatches && existingMatches.length > 0) {
      console.log(`[${requestId}] Returning ${existingMatches.length} existing matches`);
      const products = existingMatches.map((m: any) => ({
        ...m.products,
        match_score: m.match_score,
        is_top_pick: m.is_top_pick
      }));
      return new Response(
        JSON.stringify({ products }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Generate category-specific mock products
    const categoryImages: Record<string, string[]> = {
      'Seating': [
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
        'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&q=80',
        'https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=800&q=80',
      ],
      'Tables': [
        'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&q=80',
        'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800&q=80',
        'https://images.unsplash.com/photo-1565191999001-551c187427bb?w=800&q=80',
      ],
      'Lighting': [
        'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&q=80',
        'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80',
        'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=800&q=80',
      ],
      'Rugs': [
        'https://images.unsplash.com/photo-1600166898405-da9535204843?w=800&q=80',
        '/images/photo1764728757.jpg',
        'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80',
      ],
      'Storage': [
        'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=800&q=80',
        'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800&q=80',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
      ],
      'Decor': [
        'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&q=80',
        'https://images.unsplash.com/photo-1582582621959-48d27397dc69?w=800&q=80',
        'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=800&q=80',
      ],
    };

    const images = categoryImages[item.category] || categoryImages['Decor'];

    // Create mock products
    const mockProducts = [
      {
        external_id: `prod_${crypto.randomUUID()}`,
        merchant: 'Wayfair',
        product_name: `${item.item_name} - Premium Edition`,
        category: item.category,
        price: Math.floor(Math.random() * 500) + 200,
        currency: 'USD',
        product_url: 'https://www.wayfair.com',
        image_url: images[0],
        description: `High-quality ${item.category?.toLowerCase()} with ${item.style || 'modern'} design`,
        color: item.dominant_color,
        materials: item.materials || [],
        style: item.style,
        tags: item.tags || [],
        rating: 4.5,
        review_count: 342,
      },
      {
        external_id: `prod_${crypto.randomUUID()}`,
        merchant: 'West Elm',
        product_name: `${item.item_name} - Designer Collection`,
        category: item.category,
        price: Math.floor(Math.random() * 400) + 150,
        currency: 'USD',
        product_url: 'https://www.westelm.com',
        image_url: images[1],
        description: `Elegant ${item.category?.toLowerCase()} perfect for any space`,
        color: item.dominant_color,
        materials: item.materials || [],
        style: item.style,
        tags: item.tags || [],
        rating: 4.3,
        review_count: 218,
      },
      {
        external_id: `prod_${crypto.randomUUID()}`,
        merchant: 'IKEA',
        product_name: `${item.item_name} - Classic Style`,
        category: item.category,
        price: Math.floor(Math.random() * 300) + 100,
        currency: 'USD',
        product_url: 'https://www.ikea.com',
        image_url: images[2],
        description: `Timeless ${item.category?.toLowerCase()} with great value`,
        color: item.dominant_color,
        materials: item.materials || [],
        style: item.style,
        tags: item.tags || [],
        rating: 4.1,
        review_count: 567,
      },
    ];

    // Insert products
    const { data: insertedProducts, error: productError } = await supabase
      .from('products')
      .insert(mockProducts)
      .select();

    if (productError) {
      console.error(`[${requestId}] Error inserting products:`, productError);
      throw productError;
    }

    console.log(`[${requestId}] Inserted ${insertedProducts?.length} products`);

    // Create matches with scores
    const matches = insertedProducts?.map((product, index) => ({
      detected_item_id: body.detected_item_id,
      product_id: product.id,
      match_score: 0.95 - (index * 0.07), // Decreasing scores
      is_top_pick: index === 0,
    })) || [];

    const { error: matchError } = await supabase
      .from('item_product_matches')
      .insert(matches);

    if (matchError) {
      console.error(`[${requestId}] Error creating matches:`, matchError);
      throw matchError;
    }

    // Return products with match scores
    const productsWithScores = insertedProducts?.map((product, index) => ({
      ...product,
      match_score: matches[index].match_score,
      is_top_pick: matches[index].is_top_pick,
    })) || [];

    console.log(`[${requestId}] Returning ${productsWithScores.length} products`);

    return new Response(
      JSON.stringify({ products: productsWithScores }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});