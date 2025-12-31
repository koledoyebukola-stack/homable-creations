import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

interface AnalyzeRoomRequest {
  imageUrl: string;
  unknownDimensions?: boolean;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Request started:`, req.method, req.url);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Parse request body
    let body: AnalyzeRoomRequest;
    try {
      body = await req.json();
    } catch (e) {
      console.error(`[${requestId}] Failed to parse request body:`, e);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageUrl, unknownDimensions = false } = body;

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'imageUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Analyzing room image:`, imageUrl);
    console.log(`[${requestId}] Unknown dimensions:`, unknownDimensions);

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error(`[${requestId}] OPENAI_API_KEY not configured`);
      return new Response(
        JSON.stringify({ success: false, error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare Vision API prompt
    const prompt = unknownDimensions
      ? `Analyze this room image and provide a structured assessment. Focus on:

1. Room Type: Identify the room type (living room, bedroom, dining room, home office, etc.)
2. Structural Features: Count visible walls, doors, and windows
3. Proportions: Estimate relative width vs depth (e.g., "appears wider than deep" or "roughly square")
4. Blocked Zones: Identify areas that should not have furniture (door swing areas, window walls, built-in features)
5. Walkable Zones: Identify clear circulation paths and usable floor areas
6. Confidence: Rate your confidence in this analysis (high/medium/low)

Provide your response in this JSON format:
{
  "roomType": "string",
  "walls": number,
  "doors": number,
  "windows": number,
  "proportions": {
    "width": "descriptive estimate",
    "depth": "descriptive estimate"
  },
  "blockedZones": ["array", "of", "zones"],
  "walkableZones": ["array", "of", "zones"],
  "confidence": "high|medium|low",
  "rawAnalysis": "brief explanation of your assessment"
}`
      : `Analyze this room image and provide a structured assessment. The user may have some knowledge of dimensions. Focus on:

1. Room Type: Identify the room type (living room, bedroom, dining room, home office, etc.)
2. Structural Features: Count visible walls, doors, and windows
3. Proportions: Estimate approximate dimensions in feet (e.g., "12-15 feet wide, 15-18 feet deep")
4. Blocked Zones: Identify areas that should not have furniture (door swing areas, window walls, built-in features)
5. Walkable Zones: Identify clear circulation paths and usable floor areas
6. Confidence: Rate your confidence in this analysis (high/medium/low)

Provide your response in this JSON format:
{
  "roomType": "string",
  "walls": number,
  "doors": number,
  "windows": number,
  "proportions": {
    "width": "X-Y feet",
    "depth": "X-Y feet"
  },
  "blockedZones": ["array", "of", "zones"],
  "walkableZones": ["array", "of", "zones"],
  "confidence": "high|medium|low",
  "rawAnalysis": "brief explanation of your assessment"
}`;

    // Call OpenAI Vision API
    console.log(`[${requestId}] Calling OpenAI Vision API`);
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error(`[${requestId}] OpenAI API error:`, openaiResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `OpenAI API error: ${openaiResponse.status}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    console.log(`[${requestId}] OpenAI response received`);

    // Extract and parse the analysis
    const content = openaiData.choices[0]?.message?.content;
    if (!content) {
      console.error(`[${requestId}] No content in OpenAI response`);
      return new Response(
        JSON.stringify({ success: false, error: 'No analysis content received' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to parse JSON from the response
    let analysis;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanContent);
    } catch (e) {
      console.error(`[${requestId}] Failed to parse OpenAI response as JSON:`, e);
      console.error(`[${requestId}] Raw content:`, content);
      
      // Fallback: return a default analysis with low confidence
      analysis = {
        roomType: 'Unknown Room',
        walls: 4,
        doors: 1,
        windows: 1,
        proportions: {
          width: 'unable to determine',
          depth: 'unable to determine'
        },
        blockedZones: ['door area'],
        walkableZones: ['center area'],
        confidence: 'low',
        rawAnalysis: 'Unable to parse detailed analysis. Please try with a clearer image.'
      };
    }

    console.log(`[${requestId}] Analysis completed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});