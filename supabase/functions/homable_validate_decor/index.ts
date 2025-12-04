import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ValidateRequest {
  image_url: string;
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Validate decor request received:`, req.method);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 204 });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    let body: ValidateRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[${requestId}] Validating image:`, body.image_url);

    // Call OpenAI Vision API for quick validation
    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a permissive validator for a home decor app. Your job is to ALLOW images by default and ONLY reject obvious non-decor cases. Respond ONLY with valid JSON.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  'Classify this image into one category: "room", "furniture", "decor", "people", "animal", "screenshot", "outdoor", or "other". Then determine if it should be ALLOWED for a home decor app.\n\nALLOW (is_valid: true) if ANY of these are true:\n- Image shows an interior room or space (living room, bedroom, kitchen, dining, office, bathroom, entryway, closet, etc.)\n- Image contains furniture items (sofa, chair, table, bed, desk, shelves, dresser, cabinet, etc.)\n- Image shows decor elements (lamps, rugs, pillows, curtains, wall art, plants, vases, books, mirrors, etc.)\n- Image is a decor vignette or styling moment\n- Image shows any interior design inspiration\n- When uncertain, ALLOW it\n\nONLY REJECT (is_valid: false) if you are VERY CONFIDENT it is one of these:\n- Selfie or portrait where people are the main focus (not just people in a room)\n- Animal/pet as the main subject (not just a pet in a decorated room)\n- Screenshot, meme, logo, document, or UI interface\n- Car, vehicle, or automotive focus\n- Pure outdoor landscape with no interior elements\n- Food as the main subject\n- Random objects with no decor context\n\nRespond ONLY with JSON in this exact format: {"type": "room|furniture|decor|people|animal|screenshot|outdoor|other", "is_valid": true/false, "confidence": 0.0-1.0, "reason": "brief explanation"}',
              },
              {
                type: 'image_url',
                image_url: { url: body.image_url },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error(`[${requestId}] OpenAI Vision error:`, errorText);
      // Fallback: allow the image if validation fails
      console.log(`[${requestId}] Validation failed, allowing image as fallback`);
      return new Response(
        JSON.stringify({
          is_valid: true,
          confidence: 0.5,
          reason: 'Validation service unavailable, allowing by default',
          type: 'unknown',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const visionJson = await visionResponse.json();
    console.log(`[${requestId}] OpenAI validation response received`);

    const content = visionJson.choices?.[0]?.message?.content;
    if (!content) {
      // Fallback: allow the image if no content
      console.log(`[${requestId}] No content in response, allowing image as fallback`);
      return new Response(
        JSON.stringify({
          is_valid: true,
          confidence: 0.5,
          reason: 'No validation result, allowing by default',
          type: 'unknown',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error(`[${requestId}] Failed to parse OpenAI response:`, content);
      // Fallback: allow the image if parsing fails
      console.log(`[${requestId}] Parse failed, allowing image as fallback`);
      return new Response(
        JSON.stringify({
          is_valid: true,
          confidence: 0.5,
          reason: 'Validation parse error, allowing by default',
          type: 'unknown',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const type = parsed.type ?? 'unknown';
    const isValid = parsed.is_valid !== false; // Default to true unless explicitly false
    const confidence = parsed.confidence ?? 0.5;
    const reason = parsed.reason ?? 'Unknown';

    // Enhanced logging for tuning
    console.log(`[${requestId}] ===== VALIDATION RESULT =====`);
    console.log(`[${requestId}] Type: ${type}`);
    console.log(`[${requestId}] Is Valid: ${isValid}`);
    console.log(`[${requestId}] Confidence: ${confidence}`);
    console.log(`[${requestId}] Reason: ${reason}`);
    console.log(`[${requestId}] Decision: ${isValid ? 'ALLOWED' : 'BLOCKED'}`);
    console.log(`[${requestId}] ============================`);

    return new Response(
      JSON.stringify({
        is_valid: isValid,
        confidence: confidence,
        reason: reason,
        type: type,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    // Fallback: allow the image if there's an error
    console.log(`[${requestId}] Error occurred, allowing image as fallback`);
    return new Response(
      JSON.stringify({
        is_valid: true,
        confidence: 0.5,
        reason: 'Validation error, allowing by default',
        type: 'unknown',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});