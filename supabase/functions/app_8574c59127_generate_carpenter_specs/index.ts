import { createClient } from 'npm:@supabase/supabase-js@2';
import OpenAI from 'npm:openai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Credentials': 'true',
};

// Nigerian local wood materials
const NIGERIAN_MATERIALS = [
  'Obeche',
  'Mahogany',
  'Teak',
  'Hardwood',
  'Iroko',
  'Afara',
  'Abura',
];

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = performance.now();
  console.log(`[${requestId}] Request received:`, req.method, req.url);

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
      console.log(`[${requestId}] Request body:`, {
        item_id: body.item_id,
        item_name: body.item_name?.substring(0, 50),
      });
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

    const { item_id, item_name, category, style, description, color } = body;

    if (!item_id || !item_name) {
      console.error(`[${requestId}] Missing required fields`);
      return new Response(
        JSON.stringify({ error: 'item_id and item_name are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize OpenAI client
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      console.error(`[${requestId}] OPENAI_API_KEY not found`);
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({ apiKey });

    // Generate carpenter specifications using GPT-4o-mini
    console.log(`[${requestId}] Generating carpenter specs for:`, item_name);
    const openaiStart = performance.now();
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional Nigerian furniture carpenter and fabricator. Generate detailed fabrication specifications for custom furniture that can be built locally in Nigeria.

IMPORTANT RULES:
1. ALL dimensions MUST be in centimeters (cm) or meters (m)
2. Use ONLY Nigerian local wood materials: ${NIGERIAN_MATERIALS.join(', ')}
3. Provide realistic, buildable specifications
4. Include finish recommendations suitable for Nigerian climate
5. Add key construction features and joinery methods

Output ONLY valid JSON with this exact structure:
{
  "dimensions": {
    "width_cm": number,
    "depth_cm": number,
    "height_cm": number,
    "notes": "string (optional additional dimension notes)"
  },
  "material": "string (one of: ${NIGERIAN_MATERIALS.join(', ')})",
  "material_reasoning": "string (why this material is suitable)",
  "finish": "string (e.g., 'Polyurethane varnish', 'Oil finish', 'Lacquer')",
  "construction_features": [
    "string (key construction detail 1)",
    "string (key construction detail 2)",
    "string (key construction detail 3)"
  ],
  "estimated_cost_range": "string (e.g., '₦50,000 - ₦80,000')",
  "build_time": "string (e.g., '2-3 weeks')"
}

No comments, no extra text.`,
        },
        {
          role: 'user',
          content: `Generate carpenter specifications for this item:

Item Name: ${item_name}
Category: ${category || 'Not specified'}
Style: ${style || 'Not specified'}
Color: ${color || 'Not specified'}
Description: ${description || 'Not specified'}

Provide detailed fabrication specs suitable for a Nigerian carpenter.`,
        },
      ],
      max_tokens: 600,
      temperature: 0.4,
    });

    const openaiEnd = performance.now();
    console.log(`[${requestId}] ⏱️ TIMING: OpenAI API call: ${(openaiEnd - openaiStart).toFixed(2)}ms`);

    const responseText = completion.choices[0]?.message?.content;
    console.log(`[${requestId}] OpenAI raw response:`, responseText);

    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse OpenAI response
    let carpenterSpec;
    try {
      carpenterSpec = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse OpenAI response:`, parseError);
      console.error(`[${requestId}] Raw response text:`, responseText);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Validate required fields
    if (!carpenterSpec.dimensions || !carpenterSpec.material || !carpenterSpec.finish) {
      console.error(`[${requestId}] Missing required fields in carpenter spec`);
      throw new Error('Incomplete carpenter specification generated');
    }

    console.log(`[${requestId}] Successfully generated carpenter spec`);

    const totalTime = performance.now() - startTime;
    console.log(`[${requestId}] ⏱️ TIMING: TOTAL END-TO-END: ${totalTime.toFixed(2)}ms`);

    return new Response(
      JSON.stringify({
        item_id,
        carpenter_spec: carpenterSpec,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    const totalTime = performance.now() - startTime;
    console.error(`[${requestId}] Error after ${totalTime.toFixed(2)}ms:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});