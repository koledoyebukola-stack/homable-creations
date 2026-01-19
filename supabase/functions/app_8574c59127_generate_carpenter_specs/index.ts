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

// Blueprint Generator - Code-generated SVG technical diagrams
// Isometric projection constants (30° angle)
const ISO_ANGLE = Math.PI / 6; // 30 degrees in radians
const ISO_COS = Math.cos(ISO_ANGLE);
const ISO_SIN = Math.sin(ISO_ANGLE);

interface Dimensions {
  width_cm: number;
  depth_cm: number;
  height_cm: number;
}

interface CarpenterSpec {
  dimensions: Dimensions;
  material: string;
  material_reasoning: string;
  finish: string;
  construction_features: string[];
}

function isometricProject(x: number, y: number, z: number): { x: number; y: number } {
  return {
    x: (x - y) * ISO_COS,
    y: (x + y) * ISO_SIN - z
  };
}

function svgLine(x1: number, y1: number, x2: number, y2: number): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" stroke-width="2" fill="none"/>`;
}

function drawIsometricBox(
  width: number,
  depth: number,
  height: number,
  centerX: number,
  centerY: number
): string[] {
  const lines: string[] = [];
  const w = width / 2;
  const d = depth / 2;
  const h = height;

  const corners = [
    { x: -w, y: -d, z: 0 }, { x: w, y: -d, z: 0 }, { x: w, y: d, z: 0 }, { x: -w, y: d, z: 0 },
    { x: -w, y: -d, z: h }, { x: w, y: -d, z: h }, { x: w, y: d, z: h }, { x: -w, y: d, z: h },
  ];

  const projected = corners.map(corner => {
    const proj = isometricProject(corner.x, corner.y, corner.z);
    return { x: centerX + proj.x, y: centerY + proj.y };
  });

  // Bottom face
  lines.push(svgLine(projected[0].x, projected[0].y, projected[1].x, projected[1].y));
  lines.push(svgLine(projected[1].x, projected[1].y, projected[2].x, projected[2].y));
  lines.push(svgLine(projected[2].x, projected[2].y, projected[3].x, projected[3].y));
  lines.push(svgLine(projected[3].x, projected[3].y, projected[0].x, projected[0].y));
  // Top face
  lines.push(svgLine(projected[4].x, projected[4].y, projected[5].x, projected[5].y));
  lines.push(svgLine(projected[5].x, projected[5].y, projected[6].x, projected[6].y));
  lines.push(svgLine(projected[6].x, projected[6].y, projected[7].x, projected[7].y));
  lines.push(svgLine(projected[7].x, projected[7].y, projected[4].x, projected[4].y));
  // Vertical edges
  lines.push(svgLine(projected[0].x, projected[0].y, projected[4].x, projected[4].y));
  lines.push(svgLine(projected[1].x, projected[1].y, projected[5].x, projected[5].y));
  lines.push(svgLine(projected[2].x, projected[2].y, projected[6].x, projected[6].y));
  lines.push(svgLine(projected[3].x, projected[3].y, projected[7].x, projected[7].y));

  return lines;
}

function generateBoxFrame(width: number, depth: number, height: number): string {
  const svgWidth = 400;
  const svgHeight = 400;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2 + 50;
  const lines = drawIsometricBox(width, depth, height, centerX, centerY);
  const w = width / 2;
  const d = depth / 2;
  const h = height;
  const frontCenter = isometricProject(0, -d, h / 2);
  const backCenter = isometricProject(0, d, h / 2);
  lines.push(svgLine(centerX + frontCenter.x, centerY + frontCenter.y, centerX + backCenter.x, centerY + backCenter.y));
  const leftCenter = isometricProject(-w, 0, h / 2);
  const rightCenter = isometricProject(w, 0, h / 2);
  lines.push(svgLine(centerX + leftCenter.x, centerY + leftCenter.y, centerX + rightCenter.x, centerY + rightCenter.y));
  return `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background: white;">
    ${lines.join('\n    ')}
  </svg>`;
}

function generateChairFrame(width: number, depth: number, height: number): string {
  const svgWidth = 400;
  const svgHeight = 400;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2 + 50;
  const lines: string[] = [];
  const w = width / 2;
  const d = depth / 2;
  const seatHeight = height * 0.4;
  const seatLines = drawIsometricBox(width, depth, seatHeight * 0.2, centerX, centerY);
  lines.push(...seatLines);
  const backTop = isometricProject(0, -d, height);
  const backBottom = isometricProject(0, -d, seatHeight);
  const backTopLeft = isometricProject(-w * 0.8, -d, height);
  const backTopRight = isometricProject(w * 0.8, -d, height);
  const backBottomLeft = isometricProject(-w * 0.8, -d, seatHeight);
  const backBottomRight = isometricProject(w * 0.8, -d, seatHeight);
  lines.push(svgLine(centerX + backTop.x, centerY + backTop.y, centerX + backBottom.x, centerY + backBottom.y));
  lines.push(svgLine(centerX + backTopLeft.x, centerY + backTopLeft.y, centerX + backBottomLeft.x, centerY + backBottomLeft.y));
  lines.push(svgLine(centerX + backTopRight.x, centerY + backTopRight.y, centerX + backBottomRight.x, centerY + backBottomRight.y));
  lines.push(svgLine(centerX + backTopLeft.x, centerY + backTopLeft.y, centerX + backTop.x, centerY + backTop.y));
  lines.push(svgLine(centerX + backTopRight.x, centerY + backTopRight.y, centerX + backTop.x, centerY + backTop.y));
  const legHeight = seatHeight * 0.2;
  const legs = [
    { x: -w, y: -d, z: 0 }, { x: w, y: -d, z: 0 }, { x: w, y: d, z: 0 }, { x: -w, y: d, z: 0 },
  ];
  legs.forEach(leg => {
    const legBottom = isometricProject(leg.x, leg.y, 0);
    const legTop = isometricProject(leg.x, leg.y, legHeight);
    lines.push(svgLine(centerX + legBottom.x, centerY + legBottom.y, centerX + legTop.x, centerY + legTop.y));
  });
  return `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background: white;">
    ${lines.join('\n    ')}
  </svg>`;
}

function generateTableFrameRectangular(width: number, depth: number, height: number): string {
  const svgWidth = 400;
  const svgHeight = 400;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2 + 50;
  const lines: string[] = [];
  const w = width / 2;
  const d = depth / 2;
  const tabletopThickness = height * 0.05;
  const legHeight = height - tabletopThickness;
  const topLines = drawIsometricBox(width, depth, tabletopThickness, centerX, centerY);
  lines.push(...topLines);
  const legs = [
    { x: -w * 0.9, y: -d * 0.9, z: tabletopThickness },
    { x: w * 0.9, y: -d * 0.9, z: tabletopThickness },
    { x: w * 0.9, y: d * 0.9, z: tabletopThickness },
    { x: -w * 0.9, y: d * 0.9, z: tabletopThickness },
  ];
  legs.forEach(leg => {
    const legTop = isometricProject(leg.x, leg.y, leg.z);
    const legBottom = isometricProject(leg.x, leg.y, 0);
    lines.push(svgLine(centerX + legTop.x, centerY + legTop.y, centerX + legBottom.x, centerY + legBottom.y));
  });
  const railHeight = legHeight * 0.3;
  const frontLeftRail = isometricProject(-w * 0.9, -d * 0.9, railHeight);
  const frontRightRail = isometricProject(w * 0.9, -d * 0.9, railHeight);
  lines.push(svgLine(centerX + frontLeftRail.x, centerY + frontLeftRail.y, centerX + frontRightRail.x, centerY + frontRightRail.y));
  const backLeftRail = isometricProject(-w * 0.9, d * 0.9, railHeight);
  const backRightRail = isometricProject(w * 0.9, d * 0.9, railHeight);
  lines.push(svgLine(centerX + backLeftRail.x, centerY + backLeftRail.y, centerX + backRightRail.x, centerY + backRightRail.y));
  return `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background: white;">
    ${lines.join('\n    ')}
  </svg>`;
}

function generateTableFrameRound(width: number, depth: number, height: number): string {
  const svgWidth = 400;
  const svgHeight = 400;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2 + 50;
  const lines: string[] = [];
  const radius = Math.min(width, depth) / 2;
  const tabletopThickness = height * 0.05;
  const legHeight = height - tabletopThickness;
  const topCirclePoints: string[] = [];
  const bottomCirclePoints: string[] = [];
  const segments = 32;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const topProj = isometricProject(x, y, height);
    const bottomProj = isometricProject(x, y, height - tabletopThickness);
    topCirclePoints.push(`${centerX + topProj.x},${centerY + topProj.y}`);
    bottomCirclePoints.push(`${centerX + bottomProj.x},${centerY + bottomProj.y}`);
  }
  lines.push(`<polyline points="${topCirclePoints.join(' ')}" stroke="black" stroke-width="2" fill="none"/>`);
  lines.push(`<polyline points="${bottomCirclePoints.join(' ')}" stroke="black" stroke-width="2" fill="none"/>`);
  for (let i = 0; i <= segments; i += 8) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const topProj = isometricProject(x, y, height);
    const bottomProj = isometricProject(x, y, height - tabletopThickness);
    lines.push(svgLine(centerX + topProj.x, centerY + topProj.y, centerX + bottomProj.x, centerY + bottomProj.y));
  }
  const legTop = isometricProject(0, 0, height - tabletopThickness);
  const legBottom = isometricProject(0, 0, 0);
  lines.push(svgLine(centerX + legTop.x, centerY + legTop.y, centerX + legBottom.x, centerY + legBottom.y));
  const baseRadius = radius * 0.3;
  const basePoints: string[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * baseRadius;
    const y = Math.sin(angle) * baseRadius;
    const baseProj = isometricProject(x, y, legHeight * 0.2);
    basePoints.push(`${centerX + baseProj.x},${centerY + baseProj.y}`);
  }
  lines.push(`<polyline points="${basePoints.join(' ')}" stroke="black" stroke-width="2" fill="none"/>`);
  return `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background: white;">
    ${lines.join('\n    ')}
  </svg>`;
}

function generateBenchFrame(width: number, depth: number, height: number): string {
  const svgWidth = 400;
  const svgHeight = 400;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2 + 50;
  const lines: string[] = [];
  const w = width / 2;
  const d = depth / 2;
  const seatThickness = height * 0.15;
  const seatLines = drawIsometricBox(width, depth, seatThickness, centerX, centerY);
  lines.push(...seatLines);
  const legHeight = height * 0.2;
  const legs = [
    { x: -w * 0.85, y: -d * 0.85, z: seatThickness },
    { x: w * 0.85, y: -d * 0.85, z: seatThickness },
    { x: w * 0.85, y: d * 0.85, z: seatThickness },
    { x: -w * 0.85, y: d * 0.85, z: seatThickness },
  ];
  legs.forEach(leg => {
    const legTop = isometricProject(leg.x, leg.y, leg.z);
    const legBottom = isometricProject(leg.x, leg.y, 0);
    lines.push(svgLine(centerX + legTop.x, centerY + legTop.y, centerX + legBottom.x, centerY + legBottom.y));
  });
  const railHeight = legHeight * 0.5;
  const frontLeftRail = isometricProject(-w * 0.85, -d * 0.85, railHeight);
  const frontRightRail = isometricProject(w * 0.85, -d * 0.85, railHeight);
  lines.push(svgLine(centerX + frontLeftRail.x, centerY + frontLeftRail.y, centerX + frontRightRail.x, centerY + frontRightRail.y));
  const backLeftRail = isometricProject(-w * 0.85, d * 0.85, railHeight);
  const backRightRail = isometricProject(w * 0.85, d * 0.85, railHeight);
  lines.push(svgLine(centerX + backLeftRail.x, centerY + backLeftRail.y, centerX + backRightRail.x, centerY + backRightRail.y));
  return `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background: white;">
    ${lines.join('\n    ')}
  </svg>`;
}

function selectTemplate(category: string | undefined, itemName: string): 'box' | 'chair' | 'table-rect' | 'table-round' | 'bench' {
  if (!category) {
    const nameLower = itemName.toLowerCase();
    if (nameLower.includes('chair') || nameLower.includes('armchair') || nameLower.includes('lounge')) return 'chair';
    if (nameLower.includes('table') || nameLower.includes('desk') || nameLower.includes('console')) {
      return nameLower.includes('round') || nameLower.includes('circular') ? 'table-round' : 'table-rect';
    }
    if (nameLower.includes('bench') || nameLower.includes('ottoman') || nameLower.includes('stool')) return 'bench';
    return 'box';
  }
  const catLower = category.toLowerCase();
  if (catLower.includes('chair') || catLower.includes('armchair') || catLower.includes('lounge')) return 'chair';
  if (catLower.includes('table') || catLower.includes('desk') || catLower.includes('console')) {
    if (catLower.includes('round') || catLower.includes('circular') || catLower.includes('coffee')) return 'table-round';
    return 'table-rect';
  }
  if (catLower.includes('bench') || catLower.includes('ottoman') || catLower.includes('stool')) return 'bench';
  return 'box';
}

function generateBlueprintSVG(spec: CarpenterSpec, category?: string, itemName?: string): string {
  const { width_cm, depth_cm, height_cm } = spec.dimensions;
  const scale = 2;
  const width = width_cm * scale;
  const depth = depth_cm * scale;
  const height = height_cm * scale;
  const template = selectTemplate(category, itemName || '');
  switch (template) {
    case 'box': return generateBoxFrame(width, depth, height);
    case 'chair': return generateChairFrame(width, depth, height);
    case 'table-rect': return generateTableFrameRectangular(width, depth, height);
    case 'table-round': return generateTableFrameRound(width, depth, height);
    case 'bench': return generateBenchFrame(width, depth, height);
    default: return generateBoxFrame(width, depth, height);
  }
}

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
  ]
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

    // Generate SVG blueprint diagram
    console.log(`[${requestId}] Generating SVG blueprint diagram...`);
    const imageGenStart = performance.now();
    
    let technicalImageUrl: string | null = null;
    try {
      const dimensions = carpenterSpec.dimensions;
      const svgString = generateBlueprintSVG(
        carpenterSpec,
        category,
        item_name
      );
      
      // Convert SVG string to data URL (URL-encoded for better compatibility)
      const encodedSvg = encodeURIComponent(svgString);
      const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
      technicalImageUrl = svgDataUrl;
      console.log(`[${requestId}] Successfully generated SVG blueprint diagram`);
    } catch (imageError) {
      console.error(`[${requestId}] Error generating SVG blueprint:`, imageError);
      // Continue without image - don't fail the entire request
      technicalImageUrl = null;
    }

    const imageGenEnd = performance.now();
    console.log(`[${requestId}] ⏱️ TIMING: Blueprint generation: ${(imageGenEnd - imageGenStart).toFixed(2)}ms`);

    const totalTime = performance.now() - startTime;
    console.log(`[${requestId}] ⏱️ TIMING: TOTAL END-TO-END: ${totalTime.toFixed(2)}ms`);

    return new Response(
      JSON.stringify({
        item_id,
        carpenter_spec: {
          ...carpenterSpec,
          technical_image_url: technicalImageUrl,
        },
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