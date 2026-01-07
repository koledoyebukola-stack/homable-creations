import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Request received:`, {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      }
    });
  }

  try {
    // Parse the image URL from query params
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get('url');
    
    if (!imageUrl) {
      console.error(`[${requestId}] Missing 'url' parameter`);
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    console.log(`[${requestId}] Fetching image from:`, imageUrl);

    // Fetch the image from MGX CDN
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      console.error(`[${requestId}] Failed to fetch image:`, imageResponse.status, imageResponse.statusText);
      return new Response(JSON.stringify({ 
        error: `Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}` 
      }), {
        status: imageResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Get the image blob
    const imageBlob = await imageResponse.blob();
    console.log(`[${requestId}] Image fetched successfully, size:`, imageBlob.size, 'type:', imageBlob.type);

    // Return the image with CORS headers
    return new Response(imageBlob, {
      status: 200,
      headers: {
        'Content-Type': imageBlob.type || 'image/png',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(JSON.stringify({ 
      error: error.message,
      requestId 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});