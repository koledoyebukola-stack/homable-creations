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

/**
 * Blueprint Engine v1 – geometry and annotation frozen.
 * Changes require explicit design review.
 * 
 * VERIFICATION CHECKLIST:
 * For each frame type (Chair, Table Rect, Table Round, Box, Bench):
 * - Render one example with dimensions ON (showDimensions=true)
 * - Render one example with dimensions OFF (showDimensions=false)
 * - Confirm no overlaps, clipping, or missing lines
 * - Verify dimension labels (W, D, H) are visible and correctly positioned
 * - Verify extension lines maintain 2.5px gap from structure
 * - Verify arrowheads render correctly at both ends of dimension lines
 */
// Blueprint Generator - Code-generated SVG technical diagrams
// Isometric projection constants (30° angle)
// Strict values: cos = 0.866, sin = 0.5
const ISO_COS = 0.866;
const ISO_SIN = 0.5;

/**
 * BlueprintType enum - Strict blueprint template types
 * Used for deterministic template selection
 */
enum BlueprintType {
  CHAIR_SINGLE = 'CHAIR_SINGLE',
  SOFA_MULTI = 'SOFA_MULTI',
  TABLE_RECT = 'TABLE_RECT',
  TABLE_ROUND = 'TABLE_ROUND',
  BENCH = 'BENCH',
  STORAGE_BOX = 'STORAGE_BOX',
  BED = 'BED',
  BOOKSHELF = 'BOOKSHELF'
}

/**
 * Resolve blueprint type deterministically
 * First matching rule wins - no ambiguity
 * @param itemName - Item name string
 * @param category - Category string (optional)
 * @param width_cm - Width in centimeters
 * @param depth_cm - Depth in centimeters
 * @returns BlueprintType enum value
 */
function resolveBlueprintType(
  itemName: string,
  category: string | undefined,
  width_cm: number,
  depth_cm: number
): BlueprintType {
  const searchText = `${category || ''} ${itemName}`.toLowerCase();
  
  // Rule 1: SEMANTIC/CATEGORY CHECKS FIRST (before size-based heuristics)
  // Bed → BED
  if (searchText.includes('bed')) {
    return BlueprintType.BED;
  }
  
  // Bookshelf → BOOKSHELF
  if (searchText.includes('bookshelf') || searchText.includes('shelf') || searchText.includes('bookcase')) {
    return BlueprintType.BOOKSHELF;
  }
  
  // Storage furniture (sideboard, cabinet, console, storage) → STORAGE_BOX
  if (searchText.includes('sideboard') || 
      searchText.includes('cabinet') || 
      searchText.includes('console') || 
      searchText.includes('storage') ||
      searchText.includes('wardrobe') ||
      searchText.includes('dresser') ||
      searchText.includes('chest')) {
    return BlueprintType.STORAGE_BOX;
  }
  
  // Rule 2: IF item contains "sofa" OR "couch" → SOFA_MULTI
  if (searchText.includes('sofa') || searchText.includes('couch')) {
    return BlueprintType.SOFA_MULTI;
  }
  
  // Rule 3: IF item contains "chair" AND width < 120cm → CHAIR_SINGLE
  if (searchText.includes('chair') && width_cm < 120) {
    return BlueprintType.CHAIR_SINGLE;
  }
  
  // Rule 4: IF item contains "table"
  if (searchText.includes('table')) {
    // IF |width − depth| < 10cm → TABLE_ROUND
    if (Math.abs(width_cm - depth_cm) < 10) {
      return BlueprintType.TABLE_ROUND;
    }
    // ELSE → TABLE_RECT
    return BlueprintType.TABLE_RECT;
  }
  
  // Rule 5: IF item contains "bench" OR "ottoman" → BENCH
  if (searchText.includes('bench') || searchText.includes('ottoman')) {
    return BlueprintType.BENCH;
  }
  
  // Rule 6: LAST-RESORT SIZE-BASED SOFA DETECTION
  // Only classify as sofa if width ≥ 180cm AND sofa-like proportions
  // Sofa proportions: width >> depth (typically 2:1 or more), and reasonable height range
  // This prevents wide storage furniture from being misclassified
  if (width_cm >= 180) {
    // Check for sofa-like proportions: width should be significantly larger than depth
    // Typical sofa: width 180-240cm, depth 80-100cm (ratio ~2:1 to 2.5:1)
    const widthDepthRatio = width_cm / depth_cm;
    if (widthDepthRatio >= 1.8) {
      return BlueprintType.SOFA_MULTI;
    }
    // If wide but not sofa-proportioned, treat as storage
    return BlueprintType.STORAGE_BOX;
  }
  
  // Rule 7: DEFAULT → STORAGE_BOX
  return BlueprintType.STORAGE_BOX;
}

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

function svgLine(x1: number, y1: number, x2: number, y2: number, strokeWidth: number = 2, dashPattern?: string): string {
  const dashArray = dashPattern ? `stroke-dasharray="${dashPattern}"` : '';
  // stroke-linecap="round" ensures corners connect cleanly even with minor coordinate variations
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" stroke-width="${strokeWidth}" stroke-linecap="round" fill="none" ${dashArray}/>`;
}

/**
 * Draw an arrowhead marker for dimension lines
 */
function svgArrowheadMarker(id: string): string {
  return `<defs>
    <marker id="${id}" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M 0 0 L 6 3 L 0 6 z" fill="black" stroke="none"/>
    </marker>
  </defs>`;
}

/**
 * Draw a dimension line with arrowheads and extension lines
 */
function svgDimensionLine(
  x1: number, y1: number, x2: number, y2: number,
  extension1X: number, extension1Y: number,
  extension2X: number, extension2Y: number,
  markerId: string
): string {
  // Extension lines (2-3px gap from structure)
  const ext1 = `<line x1="${x1}" y1="${y1}" x2="${extension1X}" y2="${extension1Y}" stroke="black" stroke-width="1" fill="none"/>`;
  const ext2 = `<line x1="${x2}" y1="${y2}" x2="${extension2X}" y2="${extension2Y}" stroke="black" stroke-width="1" fill="none"/>`;
  // Dimension line with arrowheads
  const dimLine = `<line x1="${extension1X}" y1="${extension1Y}" x2="${extension2X}" y2="${extension2Y}" stroke="black" stroke-width="1" fill="none" marker-start="url(#${markerId})" marker-end="url(#${markerId})"/>`;
  return `${ext1}\n    ${ext2}\n    ${dimLine}`;
}

/**
 * Draw dimension text label
 */
function svgDimensionText(x: number, y: number, text: string): string {
  return `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="10" fill="black" text-anchor="middle" dominant-baseline="middle">${text}</text>`;
}

/**
 * Reusable dimension overlay helper
 * Category-agnostic, geometry-agnostic dimension annotation system
 * @param widthPoints - Projected points for width dimension: [start, end] in 3D space
 * @param depthPoints - Projected points for depth dimension: [start, end] in 3D space
 * @param heightPoints - Projected points for height dimension: [start, end] in 3D space
 * @param centerX - SVG center X coordinate
 * @param centerY - SVG center Y coordinate
 * @param offset - Offset distance from structure (default: 15)
 * @param gap - Gap between structure and extension lines (default: 2.5)
 * @returns Array of SVG element strings
 */
function addDimensionOverlay(
  widthPoints: { x: number; y: number; z: number }[],
  depthPoints: { x: number; y: number; z: number }[],
  heightPoints: { x: number; y: number; z: number }[],
  centerX: number,
  centerY: number,
  offset: number = 15,
  gap: number = 2.5
): string[] {
  const elements: string[] = [];
  
  // Add arrowhead markers
  elements.push(svgArrowheadMarker('dimArrow'));
  
  // 1. Total Width (W) - XY plane (horizontal, front edge)
  const widthStartProj = isometricProject(widthPoints[0].x, widthPoints[0].y, widthPoints[0].z);
  const widthEndProj = isometricProject(widthPoints[1].x, widthPoints[1].y, widthPoints[1].z);
  
  // Dimension line offset downward (in screen Y direction)
  const widthDimY1 = centerY + widthStartProj.y + offset;
  const widthDimY2 = centerY + widthEndProj.y + offset;
  const widthDimX1 = centerX + widthStartProj.x;
  const widthDimX2 = centerX + widthEndProj.x;
  
  // Extension lines: from structure corners with gap
  const widthExt1X = widthDimX1;
  const widthExt1Y = centerY + widthStartProj.y + gap;
  const widthExt2X = widthDimX2;
  const widthExt2Y = centerY + widthEndProj.y + gap;
  
  elements.push(svgDimensionLine(
    widthExt1X, widthExt1Y, widthExt2X, widthExt2Y,
    widthDimX1, widthDimY1, widthDimX2, widthDimY2,
    'dimArrow'
  ));
  
  // Width label (W)
  const widthLabelX = (widthDimX1 + widthDimX2) / 2;
  const widthLabelY = widthDimY1 - 5;
  elements.push(svgDimensionText(widthLabelX, widthLabelY, 'W'));
  
  // 2. Total Depth (D) - XY plane (diagonal, side edge)
  const depthStartProj = isometricProject(depthPoints[0].x, depthPoints[0].y, depthPoints[0].z);
  const depthEndProj = isometricProject(depthPoints[1].x, depthPoints[1].y, depthPoints[1].z);
  
  // Offset diagonally (in isometric space: move in +x and +y direction)
  const depthOffsetX = offset * ISO_COS;
  const depthOffsetY = offset * ISO_SIN;
  
  const depthDimX1 = centerX + depthStartProj.x + depthOffsetX;
  const depthDimY1 = centerY + depthStartProj.y + depthOffsetY;
  const depthDimX2 = centerX + depthEndProj.x + depthOffsetX;
  const depthDimY2 = centerY + depthEndProj.y + depthOffsetY;
  
  // Extension lines: from structure corners with gap
  const depthGapX = gap * ISO_COS;
  const depthGapY = gap * ISO_SIN;
  const depthExt1X = centerX + depthStartProj.x + depthGapX;
  const depthExt1Y = centerY + depthStartProj.y + depthGapY;
  const depthExt2X = centerX + depthEndProj.x + depthGapX;
  const depthExt2Y = centerY + depthEndProj.y + depthGapY;
  
  elements.push(svgDimensionLine(
    depthExt1X, depthExt1Y, depthExt2X, depthExt2Y,
    depthDimX1, depthDimY1, depthDimX2, depthDimY2,
    'dimArrow'
  ));
  
  // Depth label (D)
  const depthLabelX = (depthDimX1 + depthDimX2) / 2;
  const depthLabelY = (depthDimY1 + depthDimY2) / 2 - 5;
  elements.push(svgDimensionText(depthLabelX, depthLabelY, 'D'));
  
  // 3. Total Height (H) - XZ or YZ plane (vertical)
  const heightStartProj = isometricProject(heightPoints[0].x, heightPoints[0].y, heightPoints[0].z);
  const heightEndProj = isometricProject(heightPoints[1].x, heightPoints[1].y, heightPoints[1].z);
  
  // Dimension line offset to the right (in screen X direction)
  const heightDimX = centerX + heightStartProj.x + offset;
  const heightDimY1 = centerY + heightStartProj.y;
  const heightDimY2 = centerY + heightEndProj.y;
  
  // Extension lines: from structure with gap
  const heightExt1X = centerX + heightStartProj.x + gap;
  const heightExt1Y = heightDimY1;
  const heightExt2X = centerX + heightEndProj.x + gap;
  const heightExt2Y = heightDimY2;
  
  elements.push(svgDimensionLine(
    heightExt1X, heightExt1Y, heightExt2X, heightExt2Y,
    heightDimX, heightDimY1, heightDimX, heightDimY2,
    'dimArrow'
  ));
  
  // Height label (H)
  const heightLabelX = heightDimX + 8;
  const heightLabelY = (heightDimY1 + heightDimY2) / 2;
  elements.push(svgDimensionText(heightLabelX, heightLabelY, 'H'));
  
  return elements;
}

/**
 * Determine if an edge is hidden based on camera position (Front-Right-Top)
 * Returns true if edge should be dashed (hidden)
 */
function isHiddenEdge(p1: { x: number; y: number; z: number }, p2: { x: number; y: number; z: number }): boolean {
  // Camera is at Front-Right-Top
  // Edges on back or left faces are hidden
  // Back face: y > 0 (positive y is back)
  // Left face: x < 0 (negative x is left)
  
  const avgY = (p1.y + p2.y) / 2;
  const avgX = (p1.x + p2.x) / 2;
  
  // Back edges (y > 0) are hidden
  if (avgY > 0) return true;
  
  // Left edges (x < 0) are hidden if not on front face
  if (avgX < 0 && avgY >= 0) return true;
  
  return false;
}

function drawIsometricBox(
  width: number,
  depth: number,
  height: number,
  centerX: number,
  centerY: number,
  zOffset: number = 0,
  omitHiddenEdges: boolean = false
): string[] {
  const lines: string[] = [];
  const w = width / 2;
  const d = depth / 2;
  const h = height;

  const corners = [
    { x: -w, y: -d, z: zOffset }, { x: w, y: -d, z: zOffset }, { x: w, y: d, z: zOffset }, { x: -w, y: d, z: zOffset },
    { x: -w, y: -d, z: zOffset + h }, { x: w, y: -d, z: zOffset + h }, { x: w, y: d, z: zOffset + h }, { x: -w, y: d, z: zOffset + h },
  ];

  const projected = corners.map(corner => {
    const proj = isometricProject(corner.x, corner.y, corner.z);
    return { x: centerX + proj.x, y: centerY + proj.y };
  });

  // Bottom face
  lines.push(svgLine(projected[0].x, projected[0].y, projected[1].x, projected[1].y)); // Front edge (always visible)
  if (!omitHiddenEdges) {
    lines.push(svgLine(projected[1].x, projected[1].y, projected[2].x, projected[2].y)); // Right side edge
    lines.push(svgLine(projected[2].x, projected[2].y, projected[3].x, projected[3].y)); // Back edge (hidden)
    lines.push(svgLine(projected[3].x, projected[3].y, projected[0].x, projected[0].y)); // Left side edge
  }
  // When omitHiddenEdges=true: only front edge of bottom face (cabinet base is implied by vertical posts)
  
  // Top face
  lines.push(svgLine(projected[4].x, projected[4].y, projected[5].x, projected[5].y)); // Front edge (always visible)
  lines.push(svgLine(projected[5].x, projected[5].y, projected[6].x, projected[6].y)); // Right side edge (always visible)
  if (!omitHiddenEdges) {
    lines.push(svgLine(projected[6].x, projected[6].y, projected[7].x, projected[7].y)); // Back edge (hidden)
  }
  lines.push(svgLine(projected[7].x, projected[7].y, projected[4].x, projected[4].y)); // Left side edge (always visible)
  
  // Vertical edges (all 4 are essential load paths)
  // Apply hidden edge logic: back verticals (y = d > 0) should be dashed
  const frontLeftBottom = { x: -w, y: -d, z: zOffset };
  const frontLeftTop = { x: -w, y: -d, z: zOffset + h };
  const frontRightBottom = { x: w, y: -d, z: zOffset };
  const frontRightTop = { x: w, y: -d, z: zOffset + h };
  const backRightBottom = { x: w, y: d, z: zOffset };
  const backRightTop = { x: w, y: d, z: zOffset + h };
  const backLeftBottom = { x: -w, y: d, z: zOffset };
  const backLeftTop = { x: -w, y: d, z: zOffset + h };
  
  // Front-left vertical (visible)
  lines.push(svgLine(projected[0].x, projected[0].y, projected[4].x, projected[4].y));
  // Front-right vertical (visible)
  lines.push(svgLine(projected[1].x, projected[1].y, projected[5].x, projected[5].y));
  // Back-right vertical (hidden - convert to dashed)
  const backRightHidden = isHiddenEdge(backRightBottom, backRightTop);
  lines.push(svgLine(projected[2].x, projected[2].y, projected[6].x, projected[6].y, undefined, backRightHidden ? '3,3' : undefined));
  // Back-left vertical (hidden - convert to dashed)
  const backLeftHidden = isHiddenEdge(backLeftBottom, backLeftTop);
  lines.push(svgLine(projected[3].x, projected[3].y, projected[7].x, projected[7].y, undefined, backLeftHidden ? '3,3' : undefined));

  return lines;
}

function generateBoxFrame(width: number, depth: number, height: number, showDimensions: boolean = false): string {
  console.log(`[generateBoxFrame] Input - width: ${width}, depth: ${depth}, height: ${height}`);
  
  // Validate inputs
  if (!isFinite(width) || !isFinite(depth) || !isFinite(height)) {
    console.error(`[generateBoxFrame] Invalid input - width: ${width}, depth: ${depth}, height: ${height}`);
    throw new Error(`Invalid dimensions: width=${width}, depth=${depth}, height=${height}`);
  }
  if (width <= 0 || depth <= 0 || height <= 0) {
    console.error(`[generateBoxFrame] Non-positive dimensions - width: ${width}, depth: ${depth}, height: ${height}`);
    throw new Error(`Non-positive dimensions: width=${width}, depth=${depth}, height=${height}`);
  }
  
  const svgWidth = 400;
  const svgHeight = 400;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2 + 50;
  
  try {
    // ============================================================
    // 1) SINGLE AUTHORITATIVE COORDINATE SYSTEM
    // ============================================================
    const dims = {
      W: width,           // Carcass width
      D: depth,           // Carcass depth
      plinthH: height * 0.08,  // Plinth height (8% of total height)
      carcassH: height * 0.92, // Carcass height (92% of total height)
    };
    
    // Z coordinates (authoritative)
    const carcassBottomZ = dims.plinthH;
    const carcassTopZ = dims.plinthH + dims.carcassH;
    
    // Half-dimensions for coordinate calculations
    const W2 = dims.W / 2;
    const D2 = dims.D / 2;
    
    // Line Weight Hierarchy (critical):
    // Line Weight Hierarchy (critical):
    // THICK (3px): Outer silhouette only (main box perimeter) - thickest
    // MEDIUM (2.2px): Vertical dividers between sections - clearly distinct from shelves
    // THIN (1px): Door frames, shelf lines, minor details - thinnest solid
    // DASHED THIN (1px): Hidden edges only - same weight as thin but dashed
    const thickStroke = 3.0;    // Outer silhouette only (thickest)
    const mediumStroke = 2.2;  // Vertical dividers (clearly distinct from shelves)
    const thinStroke = 1.0;    // Door frames, shelf lines, minor details (thinnest solid)
    
    // ============================================================
    // 2) BUILD IN EXACT ORDER: Plinth → Carcass → Shelf → Dividers
    // ============================================================
    const allLines: string[] = [];
    
    // ============================================================
    // STEP 1: PLINTH (separate box, no shared verticals)
    // ============================================================
    const plinthInset = dims.W * 0.05; // 5% inset for shadow gap
    const plinthW2 = W2 - plinthInset;
    const plinthD2 = D2 - plinthInset;
    
    const plinthCorners = [
      { x: -plinthW2, y: -plinthD2, z: 0 },
      { x: plinthW2, y: -plinthD2, z: 0 },
      { x: plinthW2, y: plinthD2, z: 0 },
      { x: -plinthW2, y: plinthD2, z: 0 },
      { x: -plinthW2, y: -plinthD2, z: dims.plinthH },
      { x: plinthW2, y: -plinthD2, z: dims.plinthH },
      { x: plinthW2, y: plinthD2, z: dims.plinthH },
      { x: -plinthW2, y: plinthD2, z: dims.plinthH },
    ];
    
    const plinthProjected = plinthCorners.map(c => {
      const p = isometricProject(c.x, c.y, c.z);
      return { x: centerX + p.x, y: centerY + p.y };
    });
    
    // Plinth bottom face (4 edges) - THICK for external outline
    allLines.push(svgLine(plinthProjected[0].x, plinthProjected[0].y, plinthProjected[1].x, plinthProjected[1].y, thickStroke)); // Front
    allLines.push(svgLine(plinthProjected[1].x, plinthProjected[1].y, plinthProjected[2].x, plinthProjected[2].y, thickStroke)); // Right
    // Back edge: DASHED THIN (hidden edge, uniform spacing)
    allLines.push(svgLine(plinthProjected[2].x, plinthProjected[2].y, plinthProjected[3].x, plinthProjected[3].y, thinStroke, '4,2')); // Back (dashed)
    allLines.push(svgLine(plinthProjected[3].x, plinthProjected[3].y, plinthProjected[0].x, plinthProjected[0].y, thickStroke)); // Left
    
    // Plinth top face (4 edges) - THICK for external outline
    allLines.push(svgLine(plinthProjected[4].x, plinthProjected[4].y, plinthProjected[5].x, plinthProjected[5].y, thickStroke)); // Front
    allLines.push(svgLine(plinthProjected[5].x, plinthProjected[5].y, plinthProjected[6].x, plinthProjected[6].y, thickStroke)); // Right
    // Back edge: DASHED THIN (hidden edge, uniform spacing)
    allLines.push(svgLine(plinthProjected[6].x, plinthProjected[6].y, plinthProjected[7].x, plinthProjected[7].y, thinStroke, '4,2')); // Back (dashed)
    allLines.push(svgLine(plinthProjected[7].x, plinthProjected[7].y, plinthProjected[4].x, plinthProjected[4].y, thickStroke)); // Left
    
    // Plinth verticals (4 edges) - THICK for external outline
    allLines.push(svgLine(plinthProjected[0].x, plinthProjected[0].y, plinthProjected[4].x, plinthProjected[4].y, thickStroke)); // Front-left
    allLines.push(svgLine(plinthProjected[1].x, plinthProjected[1].y, plinthProjected[5].x, plinthProjected[5].y, thickStroke)); // Front-right
    // Back verticals: DASHED THIN (hidden edges, uniform spacing)
    allLines.push(svgLine(plinthProjected[2].x, plinthProjected[2].y, plinthProjected[6].x, plinthProjected[6].y, thinStroke, '4,2')); // Back-right (dashed)
    allLines.push(svgLine(plinthProjected[3].x, plinthProjected[3].y, plinthProjected[7].x, plinthProjected[7].y, thinStroke, '4,2')); // Back-left (dashed)
    
    // ============================================================
    // STEP 2: CARCASS OUTER FRAME (all 12 edges explicitly drawn)
    // ============================================================
    // Outer carcass corners (full width/depth) - precise coordinates
    const carcassCorners = [
      { x: -W2, y: -D2, z: carcassBottomZ }, // Front-left-bottom
      { x: W2, y: -D2, z: carcassBottomZ },  // Front-right-bottom
      { x: W2, y: D2, z: carcassBottomZ },   // Back-right-bottom
      { x: -W2, y: D2, z: carcassBottomZ },  // Back-left-bottom
      { x: -W2, y: -D2, z: carcassTopZ },    // Front-left-top
      { x: W2, y: -D2, z: carcassTopZ },      // Front-right-top
      { x: W2, y: D2, z: carcassTopZ },       // Back-right-top
      { x: -W2, y: D2, z: carcassTopZ },      // Back-left-top
    ];
    
    const carcassProjected = carcassCorners.map(c => {
      const p = isometricProject(c.x, c.y, c.z);
      return { x: centerX + p.x, y: centerY + p.y };
    });
    
    // Outer carcass frame - THICK for external outline (ONE line per edge, precise corners)
    // CRITICAL: Define top-right corner point ONCE to ensure exact coordinate matching
    const topRightCorner = carcassProjected[5]; // Front-right-top corner (exact coordinates)
    
    // Draw in order to ensure perfect corner connections: bottom → top → verticals
    // Bottom rails (4 edges)
    allLines.push(svgLine(carcassProjected[0].x, carcassProjected[0].y, carcassProjected[1].x, carcassProjected[1].y, thickStroke)); // Front (THICK)
    allLines.push(svgLine(carcassProjected[1].x, carcassProjected[1].y, carcassProjected[2].x, carcassProjected[2].y, thickStroke)); // Right (THICK)
    // Back bottom rail: DASHED THIN (hidden edge, uniform spacing)
    allLines.push(svgLine(carcassProjected[2].x, carcassProjected[2].y, carcassProjected[3].x, carcassProjected[3].y, thinStroke, '4,2')); // Back (dashed)
    allLines.push(svgLine(carcassProjected[3].x, carcassProjected[3].y, carcassProjected[0].x, carcassProjected[0].y, thickStroke)); // Left (THICK)
    
    // Top rails (4 edges) - THICK for external outline
    // CRITICAL: Top edge ENDS at topRightCorner, Right edge STARTS at topRightCorner (exact same coordinates)
    allLines.push(svgLine(carcassProjected[4].x, carcassProjected[4].y, topRightCorner.x, topRightCorner.y, thickStroke)); // Front top edge - ENDS at topRightCorner
    allLines.push(svgLine(topRightCorner.x, topRightCorner.y, carcassProjected[6].x, carcassProjected[6].y, thickStroke)); // Right top edge - STARTS at topRightCorner
    // Back top rail: DASHED THIN (hidden edge, uniform spacing)
    allLines.push(svgLine(carcassProjected[6].x, carcassProjected[6].y, carcassProjected[7].x, carcassProjected[7].y, thinStroke, '4,2')); // Back (dashed)
    allLines.push(svgLine(carcassProjected[7].x, carcassProjected[7].y, carcassProjected[4].x, carcassProjected[4].y, thickStroke)); // Left (THICK)
    
    // Vertical corner posts (4 edges) - THICK for external outline
    // CRITICAL: Front-right vertical ENDS at topRightCorner (exact same coordinates)
    allLines.push(svgLine(carcassProjected[0].x, carcassProjected[0].y, carcassProjected[4].x, carcassProjected[4].y, thickStroke)); // Front-left (THICK)
    allLines.push(svgLine(carcassProjected[1].x, carcassProjected[1].y, topRightCorner.x, topRightCorner.y, thickStroke)); // Front-right vertical - ENDS at topRightCorner
    // Back verticals: DASHED THIN (hidden edges, uniform spacing)
    allLines.push(svgLine(carcassProjected[2].x, carcassProjected[2].y, carcassProjected[6].x, carcassProjected[6].y, thinStroke, '4,2')); // Back-right (dashed)
    allLines.push(svgLine(carcassProjected[3].x, carcassProjected[3].y, carcassProjected[7].x, carcassProjected[7].y, thinStroke, '4,2')); // Back-left (dashed)
    
    // ============================================================
    // STEP 3: INTERNAL SHELVES (middle open section - show shelf thickness)
    // ============================================================
    // Define section widths first (equal width sections)
    const sectionWidth = dims.W / 3;
    const divider2X = -W2 + sectionWidth; // Left divider (between left cabinet and middle)
    const divider3X = W2 - sectionWidth;   // Right divider (between middle and right cabinet)
    
    // Middle section spans from divider2X to divider3X
    const middleSectionLeft = divider2X;
    const middleSectionRight = divider3X;
    
    // Shelf positions in middle section (3 shelves)
    const shelf1Z = carcassBottomZ + dims.carcassH * 0.3;
    const shelf2Z = carcassBottomZ + dims.carcassH * 0.55;
    const shelf3Z = carcassBottomZ + dims.carcassH * 0.8;
    const shelfThickness = dims.carcassH * 0.03; // ~3/4" to 1" in scale (3% of carcass height)
    
    // Draw each shelf with proper thickness (top and bottom surfaces)
    const shelfPositions = [shelf1Z, shelf2Z, shelf3Z];
    
    for (const shelfZ of shelfPositions) {
      // Shelf top surface corners (within middle section, connecting to dividers)
      const shelfTopCorners = [
        { x: middleSectionLeft, y: -D2, z: shelfZ + shelfThickness }, // Front-left-top
        { x: middleSectionRight, y: -D2, z: shelfZ + shelfThickness }, // Front-right-top
        { x: middleSectionRight, y: D2, z: shelfZ + shelfThickness }, // Back-right-top
        { x: middleSectionLeft, y: D2, z: shelfZ + shelfThickness },  // Back-left-top
      ];
      
      const shelfTopProjected = shelfTopCorners.map(c => {
        const p = isometricProject(c.x, c.y, c.z);
        return { x: centerX + p.x, y: centerY + p.y };
      });
      
      // Shelf top surface edges - THIN (shelf lines inside middle section)
      allLines.push(svgLine(shelfTopProjected[0].x, shelfTopProjected[0].y, shelfTopProjected[1].x, shelfTopProjected[1].y, thinStroke)); // Front (solid, visible)
      allLines.push(svgLine(shelfTopProjected[1].x, shelfTopProjected[1].y, shelfTopProjected[2].x, shelfTopProjected[2].y, thinStroke)); // Right (solid, visible)
      // Back edge: DASHED THIN (hidden edge, uniform spacing)
      allLines.push(svgLine(shelfTopProjected[2].x, shelfTopProjected[2].y, shelfTopProjected[3].x, shelfTopProjected[3].y, thinStroke, '4,2')); // Back (dashed)
      allLines.push(svgLine(shelfTopProjected[3].x, shelfTopProjected[3].y, shelfTopProjected[0].x, shelfTopProjected[0].y, thinStroke)); // Left (solid, visible)
      
      // Shelf front vertical edges (showing thickness) - THIN
      const shelfBottomCorners = [
        { x: middleSectionLeft, y: -D2, z: shelfZ },
        { x: middleSectionRight, y: -D2, z: shelfZ },
      ];
      const shelfBottomProjected = shelfBottomCorners.map(c => {
        const p = isometricProject(c.x, c.y, c.z);
        return { x: centerX + p.x, y: centerY + p.y };
      });
      
      allLines.push(svgLine(shelfTopProjected[0].x, shelfTopProjected[0].y, shelfBottomProjected[0].x, shelfBottomProjected[0].y, thinStroke)); // Front-left vertical
      allLines.push(svgLine(shelfTopProjected[1].x, shelfTopProjected[1].y, shelfBottomProjected[1].x, shelfBottomProjected[1].y, thinStroke)); // Front-right vertical
    }
    
    // ============================================================
    // STEP 4: INTERNAL DIVIDERS (vertical partitions - equal width sections)
    // ============================================================
    // divider2X and divider3X already defined in STEP 3
    
    // Divider 2: Left divider (between left cabinet and middle section)
    const divider2FrontBottom = { x: divider2X, y: -D2, z: carcassBottomZ };
    const divider2FrontTop = { x: divider2X, y: -D2, z: carcassTopZ };
    const divider2BackBottom = { x: divider2X, y: D2, z: carcassBottomZ };
    const divider2BackTop = { x: divider2X, y: D2, z: carcassTopZ };
    
    const divider2FrontBottomProj = isometricProject(divider2FrontBottom.x, divider2FrontBottom.y, divider2FrontBottom.z);
    const divider2FrontTopProj = isometricProject(divider2FrontTop.x, divider2FrontTop.y, divider2FrontTop.z);
    const divider2BackBottomProj = isometricProject(divider2BackBottom.x, divider2BackBottom.y, divider2BackBottom.z);
    const divider2BackTopProj = isometricProject(divider2BackTop.x, divider2BackTop.y, divider2BackTop.z);
    
    // Divider 2: MEDIUM for major internal division (section dividers)
    // Front edge: SOLID (visible, clearly reads as vertical partition, perfectly vertical)
    allLines.push(svgLine(
      centerX + divider2FrontBottomProj.x, centerY + divider2FrontBottomProj.y,
      centerX + divider2FrontTopProj.x, centerY + divider2FrontTopProj.y,
      mediumStroke
    ));
    // Back edge: DASHED THIN (hidden edge, uniform spacing)
    allLines.push(svgLine(
      centerX + divider2BackBottomProj.x, centerY + divider2BackBottomProj.y,
      centerX + divider2BackTopProj.x, centerY + divider2BackTopProj.y,
      thinStroke, '4,2'
    ));
    
    // Divider 3: Right divider (between middle section and right cabinet)
    const divider3FrontBottom = { x: divider3X, y: -D2, z: carcassBottomZ };
    const divider3FrontTop = { x: divider3X, y: -D2, z: carcassTopZ };
    const divider3BackBottom = { x: divider3X, y: D2, z: carcassBottomZ };
    const divider3BackTop = { x: divider3X, y: D2, z: carcassTopZ };
    
    const divider3FrontBottomProj = isometricProject(divider3FrontBottom.x, divider3FrontBottom.y, divider3FrontBottom.z);
    const divider3FrontTopProj = isometricProject(divider3FrontTop.x, divider3FrontTop.y, divider3FrontTop.z);
    const divider3BackBottomProj = isometricProject(divider3BackBottom.x, divider3BackBottom.y, divider3BackBottom.z);
    const divider3BackTopProj = isometricProject(divider3BackTop.x, divider3BackTop.y, divider3BackTop.z);
    
    // Divider 3: MEDIUM for major internal division (section dividers)
    // Front edge: SOLID (visible, clearly reads as vertical partition, perfectly vertical)
    allLines.push(svgLine(
      centerX + divider3FrontBottomProj.x, centerY + divider3FrontBottomProj.y,
      centerX + divider3FrontTopProj.x, centerY + divider3FrontTopProj.y,
      mediumStroke
    ));
    // Back edge: DASHED THIN (hidden edge, uniform spacing)
    allLines.push(svgLine(
      centerX + divider3BackBottomProj.x, centerY + divider3BackBottomProj.y,
      centerX + divider3BackTopProj.x, centerY + divider3BackTopProj.y,
      thinStroke, '4,2'
    ));
    
    // ============================================================
    // STEP 5: CABINET DOOR PANELS (left and right sections - proper isometric angles)
    // ============================================================
    // Door inset: 1/4" to 1/2" recessed from front edge (approximately 1.5% of width)
    const doorInset = dims.W * 0.015;
    const doorVerticalMargin = dims.carcassH * 0.05; // Small margin top and bottom
    
    // Left cabinet door panel (simple rectangle parallel to front face)
    const leftDoorLeft = -W2 + doorInset;
    const leftDoorRight = divider2X - doorInset;
    const leftDoorBottom = carcassBottomZ + doorVerticalMargin;
    const leftDoorTop = carcassTopZ - doorVerticalMargin;
    
    // Door panel corners (all at y = -D2, front face, proper isometric projection)
    const leftDoorCorners = [
      { x: leftDoorLeft, y: -D2, z: leftDoorBottom },   // Bottom-left
      { x: leftDoorRight, y: -D2, z: leftDoorBottom }, // Bottom-right
      { x: leftDoorRight, y: -D2, z: leftDoorTop },     // Top-right
      { x: leftDoorLeft, y: -D2, z: leftDoorTop },      // Top-left
    ];
    
    const leftDoorProjected = leftDoorCorners.map(c => {
      const p = isometricProject(c.x, c.y, c.z);
      return { x: centerX + p.x, y: centerY + p.y };
    });
    
    // Left door panel outline - MEDIUM (door panel outline)
    allLines.push(svgLine(leftDoorProjected[0].x, leftDoorProjected[0].y, leftDoorProjected[1].x, leftDoorProjected[1].y, mediumStroke)); // Bottom
    allLines.push(svgLine(leftDoorProjected[1].x, leftDoorProjected[1].y, leftDoorProjected[2].x, leftDoorProjected[2].y, mediumStroke)); // Right
    allLines.push(svgLine(leftDoorProjected[2].x, leftDoorProjected[2].y, leftDoorProjected[3].x, leftDoorProjected[3].y, mediumStroke)); // Top
    allLines.push(svgLine(leftDoorProjected[3].x, leftDoorProjected[3].y, leftDoorProjected[0].x, leftDoorProjected[0].y, mediumStroke)); // Left
    
    // Left door frame (recessed inset) - THIN, perfectly rectangular on front face
    const leftFrameInset = doorInset * 0.5; // Frame is half the door inset
    const leftFrameBottom = leftDoorBottom - doorVerticalMargin * 0.5;
    const leftFrameTop = leftDoorTop + doorVerticalMargin * 0.5;
    
    // Frame corners (all at y = -D2, front face, perfectly vertical sides)
    const leftFrameCorners = [
      { x: leftDoorLeft - leftFrameInset, y: -D2, z: leftFrameBottom }, // Bottom-left
      { x: leftDoorRight + leftFrameInset, y: -D2, z: leftFrameBottom }, // Bottom-right
      { x: leftDoorRight + leftFrameInset, y: -D2, z: leftFrameTop },   // Top-right
      { x: leftDoorLeft - leftFrameInset, y: -D2, z: leftFrameTop },     // Top-left
    ];
    
    const leftFrameProjected = leftFrameCorners.map(c => {
      const p = isometricProject(c.x, c.y, c.z);
      return { x: centerX + p.x, y: centerY + p.y };
    });
    
    // Left door frame outline - THIN (subtle inset frame, perfectly rectangular)
    allLines.push(svgLine(leftFrameProjected[0].x, leftFrameProjected[0].y, leftFrameProjected[1].x, leftFrameProjected[1].y, thinStroke)); // Bottom (horizontal)
    allLines.push(svgLine(leftFrameProjected[1].x, leftFrameProjected[1].y, leftFrameProjected[2].x, leftFrameProjected[2].y, thinStroke)); // Right (perfectly vertical)
    allLines.push(svgLine(leftFrameProjected[2].x, leftFrameProjected[2].y, leftFrameProjected[3].x, leftFrameProjected[3].y, thinStroke)); // Top (horizontal)
    allLines.push(svgLine(leftFrameProjected[3].x, leftFrameProjected[3].y, leftFrameProjected[0].x, leftFrameProjected[0].y, thinStroke)); // Left (perfectly vertical)
    
    // Left door hardware (circle at vertical center, 1/3 in from right edge) - THIN
    const leftHardwareX = leftDoorRight - (leftDoorRight - leftDoorLeft) / 3;
    const leftHardwareZ = (leftDoorBottom + leftDoorTop) / 2;
    const leftHardwareCenter = isometricProject(leftHardwareX, -D2, leftHardwareZ);
    const hardwareRadius = dims.carcassH * 0.02; // Small circle
    allLines.push(`<circle cx="${centerX + leftHardwareCenter.x}" cy="${centerY + leftHardwareCenter.y}" r="${hardwareRadius}" stroke="black" stroke-width="${thinStroke}" fill="none"/>`);
    
    // Right cabinet door panel (equal width to left door)
    const rightDoorLeft = divider3X + doorInset;
    const rightDoorRight = W2 - doorInset;
    const rightDoorBottom = leftDoorBottom; // Same height as left door
    const rightDoorTop = leftDoorTop;       // Same height as left door
    
    const rightDoorCorners = [
      { x: rightDoorLeft, y: -D2, z: rightDoorBottom },
      { x: rightDoorRight, y: -D2, z: rightDoorBottom },
      { x: rightDoorRight, y: -D2, z: rightDoorTop },
      { x: rightDoorLeft, y: -D2, z: rightDoorTop },
    ];
    
    const rightDoorProjected = rightDoorCorners.map(c => {
      const p = isometricProject(c.x, c.y, c.z);
      return { x: centerX + p.x, y: centerY + p.y };
    });
    
    // Right door panel outline - MEDIUM (door panel outline)
    allLines.push(svgLine(rightDoorProjected[0].x, rightDoorProjected[0].y, rightDoorProjected[1].x, rightDoorProjected[1].y, mediumStroke)); // Bottom
    allLines.push(svgLine(rightDoorProjected[1].x, rightDoorProjected[1].y, rightDoorProjected[2].x, rightDoorProjected[2].y, mediumStroke)); // Right
    allLines.push(svgLine(rightDoorProjected[2].x, rightDoorProjected[2].y, rightDoorProjected[3].x, rightDoorProjected[3].y, mediumStroke)); // Top
    allLines.push(svgLine(rightDoorProjected[3].x, rightDoorProjected[3].y, rightDoorProjected[0].x, rightDoorProjected[0].y, mediumStroke)); // Left
    
    // Right door frame (recessed inset) - THIN, perfectly rectangular on front face
    const rightFrameInset = leftFrameInset;
    const rightFrameBottom = rightDoorBottom - doorVerticalMargin * 0.5;
    const rightFrameTop = rightDoorTop + doorVerticalMargin * 0.5;
    
    // Frame corners (all at y = -D2, front face, perfectly vertical sides)
    const rightFrameCorners = [
      { x: rightDoorLeft - rightFrameInset, y: -D2, z: rightFrameBottom }, // Bottom-left
      { x: rightDoorRight + rightFrameInset, y: -D2, z: rightFrameBottom }, // Bottom-right
      { x: rightDoorRight + rightFrameInset, y: -D2, z: rightFrameTop },     // Top-right
      { x: rightDoorLeft - rightFrameInset, y: -D2, z: rightFrameTop },    // Top-left
    ];
    
    const rightFrameProjected = rightFrameCorners.map(c => {
      const p = isometricProject(c.x, c.y, c.z);
      return { x: centerX + p.x, y: centerY + p.y };
    });
    
    // Right door frame outline - THIN (subtle inset frame, perfectly rectangular)
    allLines.push(svgLine(rightFrameProjected[0].x, rightFrameProjected[0].y, rightFrameProjected[1].x, rightFrameProjected[1].y, thinStroke)); // Bottom (horizontal)
    allLines.push(svgLine(rightFrameProjected[1].x, rightFrameProjected[1].y, rightFrameProjected[2].x, rightFrameProjected[2].y, thinStroke)); // Right (perfectly vertical)
    allLines.push(svgLine(rightFrameProjected[2].x, rightFrameProjected[2].y, rightFrameProjected[3].x, rightFrameProjected[3].y, thinStroke)); // Top (horizontal)
    allLines.push(svgLine(rightFrameProjected[3].x, rightFrameProjected[3].y, rightFrameProjected[0].x, rightFrameProjected[0].y, thinStroke)); // Left (perfectly vertical)
    
    // Right door hardware (circle at vertical center, 1/3 in from left edge) - THIN
    const rightHardwareX = rightDoorLeft + (rightDoorRight - rightDoorLeft) / 3;
    const rightHardwareZ = (rightDoorBottom + rightDoorTop) / 2;
    const rightHardwareCenter = isometricProject(rightHardwareX, -D2, rightHardwareZ);
    allLines.push(`<circle cx="${centerX + rightHardwareCenter.x}" cy="${centerY + rightHardwareCenter.y}" r="${hardwareRadius}" stroke="black" stroke-width="${thinStroke}" fill="none"/>`);
    
    // ============================================================
    // 7) VALIDATION INVARIANTS
    // ============================================================
    // Validate all vertical endpoints match horizontal rails
    const allVerticalEndpoints = [
      divider2FrontBottom, divider2FrontTop, divider2BackBottom, divider2BackTop,
      divider3FrontBottom, divider3FrontTop, divider3BackBottom, divider3BackTop,
    ];
    
    for (const endpoint of allVerticalEndpoints) {
      if (endpoint.z < carcassBottomZ || endpoint.z > carcassTopZ) {
        console.error(`[generateBoxFrame] Validation failed: endpoint z=${endpoint.z} outside carcass range [${carcassBottomZ}, ${carcassTopZ}]`);
        return generateErrorSVG('Sideboard validation failed: internal divider outside carcass bounds');
      }
      
      // Check if endpoint matches a carcass rail coordinate
      const matchesBottom = Math.abs(endpoint.z - carcassBottomZ) < 0.001;
      const matchesTop = Math.abs(endpoint.z - carcassTopZ) < 0.001;
      
      if (!matchesBottom && !matchesTop) {
        console.error(`[generateBoxFrame] Validation failed: endpoint z=${endpoint.z} does not match carcass rails`);
        return generateErrorSVG('Sideboard validation failed: divider endpoint does not match carcass rail');
      }
    }
    
    const lines = allLines;
    
    // ============================================================
    // 8) DIMENSION ANNOTATIONS (optional overlay)
    // ============================================================
    const dimensionElements: string[] = [];
    if (showDimensions) {
      // Define dimension points in 3D space (using top level for width/depth)
      const widthPoints = [
        { x: -W2, y: -D2, z: dims.plinthH + dims.carcassH },  // Front-left-top
        { x: W2, y: -D2, z: dims.plinthH + dims.carcassH }    // Front-right-top
      ];
      const depthPoints = [
        { x: W2, y: -D2, z: dims.plinthH + dims.carcassH },   // Right-front-top
        { x: W2, y: D2, z: dims.plinthH + dims.carcassH }     // Right-back-top
      ];
      const heightPoints = [
        { x: W2, y: -D2, z: 0 },        // Floor (front-right)
        { x: W2, y: -D2, z: dims.plinthH + dims.carcassH }    // Top of carcass
      ];
      
      dimensionElements.push(...addDimensionOverlay(
        widthPoints,
        depthPoints,
        heightPoints,
        centerX,
        centerY,
        15,  // offset
        2.5  // gap
      ));
    }
    
    const allElements = [...lines, ...dimensionElements];
    const svgString = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background: white;">
    ${allElements.join('\n    ')}
  </svg>`;
    
    // Final validation: check for NaN or Infinity
    if (svgString.includes('NaN') || svgString.includes('Infinity')) {
      console.error(`[generateBoxFrame] SVG contains NaN or Infinity`);
      return generateErrorSVG('Sideboard SVG contains NaN or Infinity');
    }
    
    console.log(`[generateBoxFrame] SVG generated successfully, length: ${svgString.length}`);
    return svgString;
  } catch (error: any) {
    console.error(`[generateBoxFrame] Exception:`, error);
    throw error;
  }
}

/**
 * Generate SOFA_MULTI frame
 * Complete sofa blueprint with proper proportions, line weights, and canvas bounds
 * Based on technical drawing reference: W 2000, D 900, AH 650, SH 450, BT 120, AT 160
 */
function generateSofaMultiFrame(width: number, depth: number, height: number, showDimensions: boolean = false): string {
  console.log(`[generateSofaMultiFrame] Input - width: ${width}, depth: ${depth}, height: ${height}`);
  
  // Validate inputs
  if (!isFinite(width) || !isFinite(depth) || !isFinite(height)) {
    console.error(`[generateSofaMultiFrame] Invalid input - width: ${width}, depth: ${depth}, height: ${height}`);
    throw new Error(`Invalid dimensions: width=${width}, depth=${depth}, height=${height}`);
  }
  if (width <= 0 || depth <= 0 || height <= 0) {
    console.error(`[generateSofaMultiFrame] Non-positive dimensions - width: ${width}, depth: ${depth}, height: ${height}`);
    throw new Error(`Non-positive dimensions: width=${width}, depth=${depth}, height=${height}`);
  }
  
  // Canvas & Coordinate System
  const svgWidth = 800;
  const svgHeight = 600;
  const centerX = 400;
  const centerY = 380; // Safe zone for drawing
  const lines: string[] = [];
  
  // Line Weight Hierarchy
  const strokeWidths = {
    thick: 3.5,      // Outer silhouette (front edges, visible outline)
    medium: 2.2,     // Major divisions (arms, cushion separations)
    thin: 1.2,       // Surface details (cushion seams)
    dashed: 1.2      // Hidden edges (back corners, rear surfaces)
  };
  
  // Calculate scale to fit within canvas bounds (50-750 x, 50-550 y)
  // Max usable space: 700px width, 500px height
  // Input dimensions are in cm, calculate projected size in isometric space
  // Isometric projection: x_proj = (x - y) * cos30, y_proj = (x + y) * sin30 - z
  // Max projected width ≈ (width + depth) * cos30, max projected height ≈ (width + depth) * sin30 + height
  const maxProjectedWidth = (width + depth) * ISO_COS;  // width and depth are in cm
  const maxProjectedHeight = (width + depth) * ISO_SIN + height;
  
  // Target canvas usage: 70% of available space for better visibility in PDFs
  const targetWidth = 550;   // 78% of 700px available width
  const targetHeight = 400;  // 80% of 500px available height
  
  const scaleX = targetWidth / maxProjectedWidth;
  const scaleY = targetHeight / maxProjectedHeight;
  const scale = Math.min(scaleX, scaleY);  // No additional reduction needed
  
  console.log(`[generateSofaMultiFrame] Scale calculation - maxProjectedWidth: ${maxProjectedWidth}, maxProjectedHeight: ${maxProjectedHeight}, scale: ${scale}`);
  
  // Proportional Relationships - Adjusted for standard sofa construction
  // Input dimensions are ALREADY in centimeters from OpenAI
  // No conversion needed - use directly
  // Adjusted proportions for standard sofa construction
  const armWidth = width * 0.11;          // Arms are 11% of total width (20-22cm for 200cm sofa)
  const seatHeight = height * 0.53;       // Seat is 53% of total height (45cm for 85cm sofa)
  const backThickness = depth * 0.22;     // Back is 22% of depth (20cm for 90cm sofa - proper cushion depth)
  const baseHeight = height * 0.06;       // Base is ~6% of height (unchanged)
  
  // Scaled dimensions for isometric projection
  const w = width * scale;   // Scaled width
  const d = depth * scale;   // Scaled depth
  const h = height * scale;  // Scaled height
  const armW_scaled = armWidth * scale;
  const seatH_scaled = seatHeight * scale;
  const backT_scaled = backThickness * scale;
  const baseH_scaled = baseHeight * scale;
  
  console.log(`[generateSofaMultiFrame] Component dimensions - armW: ${armW_scaled}, seatH: ${seatH_scaled}, backT: ${backT_scaled}, baseH: ${baseH_scaled}`);
  
  // Half-dimensions for coordinate calculations
  const w2 = w / 2;
  const d2 = d / 2;
  
  // Z-levels (in scaled blueprint units)
  const zBase = 0;
  const zBaseTop = baseH_scaled;
  const zSeat = zBaseTop + seatH_scaled;
  const zArmTop = h; // Arm height = total height (AH 650)
  
  // Y-levels (depth direction) for back cushions
  const yBackFront = d2 - backT_scaled; // Back cushion front face (recessed from rear wall)
  const yBackRear = d2; // Back cushion rear face (at rear wall)
  
  // Helper function to project 3D point to 2D isometric and validate bounds
  function projectAndValidate(x: number, y: number, z: number): { x: number; y: number; valid: boolean } {
    const proj = isometricProject(x, y, z);
    const px = centerX + proj.x;
    const py = centerY + proj.y;
    const valid = px >= 50 && px <= 750 && py >= 50 && py <= 550;
    if (!valid) {
      console.warn(`[generateSofaMultiFrame] Coordinate out of bounds: (${px}, ${py}) from 3D (${x}, ${y}, ${z})`);
    }
    return { x: px, y: py, valid };
  }
  
  // Determine number of seat cushions (2-3 based on width)
  // Input width is already in cm
  let cushionCount = Math.floor(width / 65);
  if (cushionCount < 2) cushionCount = 2;
  if (cushionCount > 3) cushionCount = 3;
  
  console.log(`[generateSofaMultiFrame] Cushion count: ${cushionCount} (width: ${width}cm)`);
  
  // Drawing order: back to front (dashed → back → front)
  // Layer 1: Hidden edges (dashed lines)
  const hiddenLines: string[] = [];
  
  // Layer 2: Back structural elements
  const backLines: string[] = [];
  
  // Layer 3: Seat platform
  const seatLines: string[] = [];
  
  // Layer 4: Front-facing elements
  const frontLines: string[] = [];
  
  // Layer 5: Base/plinth
  const baseLines: string[] = [];
  
  // ============================================================
  // COMPONENT 1: BASE/PLINTH (recessed 15-20mm from main body)
  // ============================================================
  const baseRecess = 0.15 * scale; // 15mm recess in scaled units
  const baseW2 = w2 - baseRecess;
  const baseD2 = d2 - baseRecess;
  
  // Base corners (bottom and top) - define once for precision
  const bbl = projectAndValidate(-baseW2, -baseD2, zBase); // bottom-front-left
  const bbr = projectAndValidate(baseW2, -baseD2, zBase);  // bottom-front-right
  const btr = projectAndValidate(baseW2, baseD2, zBase);   // bottom-back-right
  const btl = projectAndValidate(-baseW2, baseD2, zBase);  // bottom-back-left
  
  const tbl = projectAndValidate(-baseW2, -baseD2, zBaseTop); // top-front-left
  const tbr = projectAndValidate(baseW2, -baseD2, zBaseTop);  // top-front-right
  const ttr = projectAndValidate(baseW2, baseD2, zBaseTop);   // top-back-right
  const ttl = projectAndValidate(-baseW2, baseD2, zBaseTop);  // top-back-left
  
  const dashPattern = '4,2';
  
  // Base bottom face (hidden edges dashed)
  baseLines.push(svgLine(bbl.x, bbl.y, bbr.x, bbr.y, strokeWidths.thick)); // Front
  baseLines.push(svgLine(bbr.x, bbr.y, btr.x, btr.y, strokeWidths.thick)); // Right
  hiddenLines.push(svgLine(btr.x, btr.y, btl.x, btl.y, strokeWidths.dashed, dashPattern)); // Back (dashed)
  baseLines.push(svgLine(btl.x, btl.y, bbl.x, bbl.y, strokeWidths.thick)); // Left
  
  // Base top face
  baseLines.push(svgLine(tbl.x, tbl.y, tbr.x, tbr.y, strokeWidths.thick)); // Front
  baseLines.push(svgLine(tbr.x, tbr.y, ttr.x, ttr.y, strokeWidths.thick)); // Right
  hiddenLines.push(svgLine(ttr.x, ttr.y, ttl.x, ttl.y, strokeWidths.dashed, dashPattern)); // Back (dashed)
  baseLines.push(svgLine(ttl.x, ttl.y, tbl.x, tbl.y, strokeWidths.thick)); // Left
  
  // Base verticals (front only, back are hidden)
  baseLines.push(svgLine(bbl.x, bbl.y, tbl.x, tbl.y, strokeWidths.thick)); // Front-left
  baseLines.push(svgLine(bbr.x, bbr.y, tbr.x, tbr.y, strokeWidths.thick)); // Front-right
  hiddenLines.push(svgLine(btr.x, btr.y, ttr.x, ttr.y, strokeWidths.dashed, dashPattern)); // Back-right (dashed)
  hiddenLines.push(svgLine(btl.x, btl.y, ttl.x, ttl.y, strokeWidths.dashed, dashPattern)); // Back-left (dashed)
  
  // ============================================================
  // AUTHORITATIVE SEAT FRAME (all components reference these)
  // ============================================================
  const seatLeftX = -w2 + armW_scaled;
  const seatRightX = w2 - armW_scaled;
  const seatThickness = 0.05 * scale; // 5mm seat thickness
  
  // Define seat frame coordinates FIRST - these are authoritative
  const seatFrame = {
    frontLeft: projectAndValidate(seatLeftX, -d2, zSeat),
    frontRight: projectAndValidate(seatRightX, -d2, zSeat),
    rearLeft: projectAndValidate(seatLeftX, d2, zSeat),
    rearRight: projectAndValidate(seatRightX, d2, zSeat)
  };
  
  // ============================================================
  // COMPONENT 2: LEFT ARM (solid rectangular volume)
  // ============================================================
  const leftArmOuterX = -w2;
  
  // Define left arm outer points
  const lfbO = projectAndValidate(leftArmOuterX, -d2, zBaseTop); // left-front-bottom-outer
  const lftO = projectAndValidate(leftArmOuterX, -d2, zArmTop);   // left-front-top-outer
  const lbbO = projectAndValidate(leftArmOuterX, d2, zBaseTop);  // left-back-bottom-outer
  const lbtO = projectAndValidate(leftArmOuterX, d2, zArmTop);   // left-back-top-outer
  
  // CRITICAL: Arm inner edges MUST reference seat frame points
  // Left arm inner points at base level (for vertical termination)
  const lfbI_base = projectAndValidate(seatLeftX, -d2, zBaseTop); // left-front-bottom-inner at base
  const lbbI_base = projectAndValidate(seatLeftX, d2, zBaseTop);  // left-back-bottom-inner at base
  
  // Left arm inner points at seat level (SHARED with seat frame)
  const lfbI_seat = seatFrame.frontLeft; // SAME OBJECT as seat front-left
  const lbbI_seat = seatFrame.rearLeft;   // SAME OBJECT as seat rear-left
  
  // Left arm inner points at top level
  const lftI = projectAndValidate(seatLeftX, -d2, zArmTop);   // left-front-top-inner
  const lbtI = projectAndValidate(seatLeftX, d2, zArmTop);   // left-back-top-inner
  
  // Left arm front face (visible)
  frontLines.push(svgLine(lfbO.x, lfbO.y, lftO.x, lftO.y, strokeWidths.medium)); // Outer vertical
  // Inner vertical: Split into two segments to show termination at seat
  frontLines.push(svgLine(lfbI_base.x, lfbI_base.y, lfbI_seat.x, lfbI_seat.y, strokeWidths.medium)); // Base to seat (terminates at seat)
  frontLines.push(svgLine(lfbI_seat.x, lfbI_seat.y, lftI.x, lftI.y, strokeWidths.medium)); // Seat to top
  frontLines.push(svgLine(lfbO.x, lfbO.y, lfbI_base.x, lfbI_base.y, strokeWidths.medium)); // Bottom horizontal
  frontLines.push(svgLine(lftO.x, lftO.y, lftI.x, lftI.y, strokeWidths.medium)); // Top horizontal
  
  // Left arm back face (hidden, dashed)
  hiddenLines.push(svgLine(lbbO.x, lbbO.y, lbtO.x, lbtO.y, strokeWidths.dashed, dashPattern)); // Outer vertical
  // Inner vertical: Split into two segments to show termination at seat
  hiddenLines.push(svgLine(lbbI_base.x, lbbI_base.y, lbbI_seat.x, lbbI_seat.y, strokeWidths.dashed, dashPattern)); // Base to seat (terminates at seat)
  hiddenLines.push(svgLine(lbbI_seat.x, lbbI_seat.y, lbtI.x, lbtI.y, strokeWidths.dashed, dashPattern)); // Seat to top
  hiddenLines.push(svgLine(lbbO.x, lbbO.y, lbbI_base.x, lbbI_base.y, strokeWidths.dashed, dashPattern)); // Bottom horizontal
  hiddenLines.push(svgLine(lbtO.x, lbtO.y, lbtI.x, lbtI.y, strokeWidths.dashed, dashPattern)); // Top horizontal
  
  // Left arm connecting edges
  frontLines.push(svgLine(lftO.x, lftO.y, lbtO.x, lbtO.y, strokeWidths.medium)); // Top outer
  hiddenLines.push(svgLine(lftI.x, lftI.y, lbtI.x, lbtI.y, strokeWidths.dashed, dashPattern)); // Top inner (dashed)
  
  // ============================================================
  // COMPONENT 3: RIGHT ARM (mirror of left)
  // ============================================================
  const rightArmOuterX = w2;
  
  // Define right arm outer points
  const rfbO = projectAndValidate(rightArmOuterX, -d2, zBaseTop); // right-front-bottom-outer
  const rftO = projectAndValidate(rightArmOuterX, -d2, zArmTop);   // right-front-top-outer
  const rbbO = projectAndValidate(rightArmOuterX, d2, zBaseTop);  // right-back-bottom-outer
  const rbtO = projectAndValidate(rightArmOuterX, d2, zArmTop);   // right-back-top-outer
  
  // CRITICAL: Arm inner edges MUST reference seat frame points
  // Right arm inner points at base level (for vertical termination)
  const rfbI_base = projectAndValidate(seatRightX, -d2, zBaseTop); // right-front-bottom-inner at base
  const rbbI_base = projectAndValidate(seatRightX, d2, zBaseTop);  // right-back-bottom-inner at base
  
  // Right arm inner points at seat level (SHARED with seat frame)
  const rfbI_seat = seatFrame.frontRight; // SAME OBJECT as seat front-right
  const rbbI_seat = seatFrame.rearRight;   // SAME OBJECT as seat rear-right
  
  // Right arm inner points at top level
  const rftI = projectAndValidate(seatRightX, -d2, zArmTop);   // right-front-top-inner
  const rbtI = projectAndValidate(seatRightX, d2, zArmTop);   // right-back-top-inner
  
  // Right arm front face (visible)
  frontLines.push(svgLine(rfbO.x, rfbO.y, rftO.x, rftO.y, strokeWidths.medium)); // Outer vertical
  // Inner vertical: Split into two segments to show termination at seat
  frontLines.push(svgLine(rfbI_base.x, rfbI_base.y, rfbI_seat.x, rfbI_seat.y, strokeWidths.medium)); // Base to seat (terminates at seat)
  frontLines.push(svgLine(rfbI_seat.x, rfbI_seat.y, rftI.x, rftI.y, strokeWidths.medium)); // Seat to top
  frontLines.push(svgLine(rfbO.x, rfbO.y, rfbI_base.x, rfbI_base.y, strokeWidths.medium)); // Bottom horizontal
  frontLines.push(svgLine(rftO.x, rftO.y, rftI.x, rftI.y, strokeWidths.medium)); // Top horizontal
  
  // Right arm back face (hidden, dashed)
  hiddenLines.push(svgLine(rbbO.x, rbbO.y, rbtO.x, rbtO.y, strokeWidths.dashed, dashPattern)); // Outer vertical
  // Inner vertical: Split into two segments to show termination at seat
  hiddenLines.push(svgLine(rbbI_base.x, rbbI_base.y, rbbI_seat.x, rbbI_seat.y, strokeWidths.dashed, dashPattern)); // Base to seat (terminates at seat)
  hiddenLines.push(svgLine(rbbI_seat.x, rbbI_seat.y, rbtI.x, rbtI.y, strokeWidths.dashed, dashPattern)); // Seat to top
  hiddenLines.push(svgLine(rbbO.x, rbbO.y, rbbI_base.x, rbbI_base.y, strokeWidths.dashed, dashPattern)); // Bottom horizontal
  hiddenLines.push(svgLine(rbtO.x, rbtO.y, rbtI.x, rbtI.y, strokeWidths.dashed, dashPattern)); // Top horizontal
  
  // Right arm connecting edges
  frontLines.push(svgLine(rftO.x, rftO.y, rbtO.x, rbtO.y, strokeWidths.medium)); // Top outer
  hiddenLines.push(svgLine(rftI.x, rftI.y, rbtI.x, rbtI.y, strokeWidths.dashed, dashPattern)); // Top inner (dashed)
  
  // ============================================================
  // COMPONENT 4: SEAT PLATFORM (ONLY top surface, no bottom face)
  // ============================================================
  // Seat frame coordinates already defined above - use them directly
  const slf = seatFrame.frontLeft;  // seat-left-front (SAME OBJECT)
  const srf = seatFrame.frontRight; // seat-right-front (SAME OBJECT)
  const srb = seatFrame.rearRight;  // seat-right-back (SAME OBJECT)
  const slb = seatFrame.rearLeft;   // seat-left-back (SAME OBJECT)
  
  // Seat top surface edges ONLY (no bottom face - eliminates redundant lines)
  frontLines.push(svgLine(slf.x, slf.y, srf.x, srf.y, strokeWidths.thick)); // Front edge (THICK - important outline)
  frontLines.push(svgLine(srf.x, srf.y, srb.x, srb.y, strokeWidths.medium)); // Right edge
  hiddenLines.push(svgLine(srb.x, srb.y, slb.x, slb.y, strokeWidths.dashed, dashPattern)); // Back edge (dashed) - THIS IS THE REAR RAIL
  frontLines.push(svgLine(slb.x, slb.y, slf.x, slf.y, strokeWidths.medium)); // Left edge
  
  // Seat cushion divisions (2-3 cushions)
  const cushionWidth = (seatRightX - seatLeftX) / cushionCount;
  for (let i = 1; i < cushionCount; i++) {
    const divX = seatLeftX + i * cushionWidth;
    const divStart = projectAndValidate(divX, -d2, zSeat);
    const divEnd = projectAndValidate(divX, d2, zSeat);
    frontLines.push(svgLine(divStart.x, divStart.y, divEnd.x, divEnd.y, strokeWidths.thin)); // Cushion division (thin)
  }
  
  // ============================================================
  // COMPONENT 5: BACKREST STRUCTURE (structural frame, not upholstery)
  // ============================================================
  const backCushionBottomZ = zSeat;
  const backCushionTopZ = zArmTop;
  
  // Back cushion Y coordinates (depth direction) - use pre-calculated values
  const backCushionFrontY = yBackFront; // Front face (recessed by back thickness)
  const backCushionRearY = yBackRear; // Rear face (at rear wall)
  
  // CRITICAL: Add explicit backrest bottom rail at seatFrameZ (structural member)
  // This rail is the receiving member for backrest posts
  const backrestBottomRailLeft = seatFrame.rearLeft;   // SAME OBJECT as seat rear-left
  const backrestBottomRailRight = seatFrame.rearRight; // SAME OBJECT as seat rear-right
  
  // Draw backrest bottom rail as structural element (MEDIUM weight)
  backLines.push(svgLine(backrestBottomRailLeft.x, backrestBottomRailLeft.y, backrestBottomRailRight.x, backrestBottomRailRight.y, strokeWidths.medium)); // Backrest bottom rail
  
  // Back cushion bottom corners (SHARED with backrest bottom rail)
  const cfb = backrestBottomRailLeft;   // cushion-front-bottom-left (SAME OBJECT)
  const cfbR = backrestBottomRailRight; // cushion-front-bottom-right (SAME OBJECT)
  
  // Back cushion top corners (front face)
  const cftR = projectAndValidate(seatRightX, backCushionFrontY, backCushionTopZ);    // cushion-front-top-right
  const cft = projectAndValidate(seatLeftX, backCushionFrontY, backCushionTopZ);      // cushion-front-top-left
  
  // Back cushion corners (rear face) - define once for precision
  const crb = projectAndValidate(seatLeftX, backCushionRearY, backCushionBottomZ);  // cushion-rear-bottom-left
  const crbR = projectAndValidate(seatRightX, backCushionRearY, backCushionBottomZ); // cushion-rear-bottom-right
  const crtR = projectAndValidate(seatRightX, backCushionRearY, backCushionTopZ);     // cushion-rear-top-right
  const crt = projectAndValidate(seatLeftX, backCushionRearY, backCushionTopZ);       // cushion-rear-top-left
  
  // Back cushion front face outline (visible, medium weight)
  // NOTE: Bottom edge is the backrest bottom rail (already drawn above)
  // Do NOT redraw the bottom edge here to avoid duplicate lines
  frontLines.push(svgLine(cfbR.x, cfbR.y, cftR.x, cftR.y, strokeWidths.medium)); // Right vertical
  frontLines.push(svgLine(cftR.x, cftR.y, cft.x, cft.y, strokeWidths.medium)); // Top horizontal
  frontLines.push(svgLine(cft.x, cft.y, cfb.x, cfb.y, strokeWidths.medium)); // Left vertical
  
  // Back cushion divisions (matching seat cushions, thin lines)
  // Backrest vertical posts terminate at the backrest bottom rail
  for (let i = 1; i < cushionCount; i++) {
    const divX = seatLeftX + i * cushionWidth;
    // Backrest post bottom (at backrest bottom rail level - seatFrameZ)
    const divPostBottom = projectAndValidate(divX, d2, backCushionBottomZ); // At rear seat rail
    // Backrest post top (at front face of cushion)
    const divFrontTop = projectAndValidate(divX, backCushionFrontY, backCushionTopZ);
    
    // Backrest vertical post (terminates at bottom rail)
    frontLines.push(svgLine(divPostBottom.x, divPostBottom.y, divFrontTop.x, divFrontTop.y, strokeWidths.thin)); // Backrest post (thin)
    // REMOVED: Diagonal line from front-top to rear-top (not a structural element)
  }
  
  // REMOVED: Back cushion depth edges (diagonal lines connecting front and rear faces)
  // These diagonals are not part of the real sofa frame structure and create visual noise
  
  // Back cushion rear face (hidden, dashed)
  hiddenLines.push(svgLine(crb.x, crb.y, crbR.x, crbR.y, strokeWidths.dashed, dashPattern)); // Bottom
  hiddenLines.push(svgLine(crbR.x, crbR.y, crtR.x, crtR.y, strokeWidths.dashed, dashPattern)); // Right
  hiddenLines.push(svgLine(crtR.x, crtR.y, crt.x, crt.y, strokeWidths.dashed, dashPattern)); // Top
  hiddenLines.push(svgLine(crt.x, crt.y, crb.x, crb.y, strokeWidths.dashed, dashPattern)); // Left
  
  // ============================================================
  // ASSEMBLE SVG IN CORRECT DRAWING ORDER (back to front)
  // ============================================================
  const allLines = [...baseLines, ...hiddenLines, ...backLines, ...seatLines, ...frontLines];
  
  // Dimension annotations layer (optional overlay)
  const dimensionElements: string[] = [];
  if (showDimensions) {
    const widthPoints = [
      { x: -w2, y: -d2, z: zArmTop },
      { x: w2, y: -d2, z: zArmTop }
    ];
    const depthPoints = [
      { x: w2, y: -d2, z: zArmTop },
      { x: w2, y: d2, z: zArmTop }
    ];
    const heightPoints = [
      { x: w2, y: -d2, z: zBase },
      { x: w2, y: -d2, z: zArmTop }
    ];
    
    dimensionElements.push(...addDimensionOverlay(
      widthPoints,
      depthPoints,
      heightPoints,
      centerX,
      centerY,
      15,
      2.5
    ));
  }
  
  const allElements = [...allLines, ...dimensionElements];
  
  // Validate coordinates are within bounds
  const allProjectedPoints = [
    bbl, bbr, btr, btl, tbl, tbr, ttr, ttl,
    lfbO, lftO, lbbO, lbtO, lfbI_base, lfbI_seat, lbbI_base, lbbI_seat, lftI, lbtI,
    rfbO, rftO, rbbO, rbtO, rfbI_base, rfbI_seat, rbbI_base, rbbI_seat, rftI, rbtI,
    slf, srf, srb, slb, // These are the same as seatFrame points
    cfb, cfbR, cftR, cft, crb, crbR, crtR, crt
  ];
  
  const outOfBounds = allProjectedPoints.filter(p => !p.valid);
  if (outOfBounds.length > 0) {
    console.error(`[generateSofaMultiFrame] ${outOfBounds.length} coordinates out of bounds`);
  }
  
  // Generate SVG string
  try {
    const svgString = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}">
    <rect width="${svgWidth}" height="${svgHeight}" fill="white"/>
    ${allElements.join('\n    ')}
  </svg>`;
    
    // Validate SVG string
    if (!svgString || svgString.includes('NaN') || svgString.includes('Infinity')) {
      console.error(`[generateSofaMultiFrame] SVG contains invalid values`);
      return generateErrorSVG('Sofa SVG contains NaN or Infinity');
    }
    
    console.log(`[generateSofaMultiFrame] SVG generated successfully, length: ${svgString.length}, lines: ${allLines.length}`);
    return svgString;
  } catch (error: any) {
    console.error(`[generateSofaMultiFrame] Exception during SVG assembly:`, error);
    return generateErrorSVG(`Sofa generation error: ${error.message}`);
  }
}

/**
 * Determine foundation type based on category keywords
 */
/**
 * Generate simplified chair blueprint
 * Components: 4 legs + 4 seat rails + 3 backrest edges
 * @param showDimensions - If true, adds dimension annotations (W, D, H) as overlay
 */
function generateChairFrame(width: number, depth: number, height: number, category?: string, itemName?: string, showDimensions: boolean = false): string {
  // Setup: canvas and coordinates
  const svgWidth = 400;
  const svgHeight = 400;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2 + 50;
  
  // Derived dimensions
  const w = width / 2;
  const d = depth / 2;
  const seatHeight = height * 0.45; // Seat at 45% of total height
  
  // Line Weight Hierarchy (match sideboard baseline)
  const thickStroke = 3.0;    // Legs, backrest posts
  const mediumStroke = 2.2;   // Seat rails
  const thinStroke = 1.0;     // Minor details (unused in simple chair)
  
  const lines: string[] = [];
  
  // Component 1: Four legs (4 vertical lines from floor to seat height)
  const legCorners = [
    { x: -w, y: -d, z: 0 },  // Front-left
    { x: w, y: -d, z: 0 },   // Front-right
    { x: w, y: d, z: 0 },    // Back-right
    { x: -w, y: d, z: 0 },   // Back-left
  ];
  
  const seatCorners = [
    { x: -w, y: -d, z: seatHeight },
    { x: w, y: -d, z: seatHeight },
    { x: w, y: d, z: seatHeight },
    { x: -w, y: d, z: seatHeight },
  ];
  
  for (let i = 0; i < 4; i++) {
    const legBottomProj = isometricProject(legCorners[i].x, legCorners[i].y, legCorners[i].z);
    const legTopProj = isometricProject(seatCorners[i].x, seatCorners[i].y, seatCorners[i].z);
    const hidden = isHiddenEdge(legCorners[i], seatCorners[i]);
    // Back legs (y > 0): dashed, Front legs (y <= 0): solid
    lines.push(svgLine(
      centerX + legBottomProj.x, centerY + legBottomProj.y,
      centerX + legTopProj.x, centerY + legTopProj.y,
      thickStroke, hidden ? '4,2' : undefined
    ));
  }
  
  // Component 2: Seat rails (4 horizontal lines forming rectangle at seat height)
  const seatProjected = seatCorners.map(corner => {
    const proj = isometricProject(corner.x, corner.y, corner.z);
    return { x: centerX + proj.x, y: centerY + proj.y };
  });
  
  // Front rail (y = -d, visible)
  lines.push(svgLine(seatProjected[0].x, seatProjected[0].y, seatProjected[1].x, seatProjected[1].y, mediumStroke));
  
  // Right rail (x = w, visible)
  lines.push(svgLine(seatProjected[1].x, seatProjected[1].y, seatProjected[2].x, seatProjected[2].y, mediumStroke));
  
  // Back rail (y = d, hidden) - dashed
  const backRailHidden = isHiddenEdge(seatCorners[2], seatCorners[3]);
  lines.push(svgLine(seatProjected[2].x, seatProjected[2].y, seatProjected[3].x, seatProjected[3].y, mediumStroke, backRailHidden ? '4,2' : undefined));
  
  // Left rail (x = -w, may be hidden)
  const leftRailHidden = isHiddenEdge(seatCorners[0], seatCorners[3]);
  lines.push(svgLine(seatProjected[3].x, seatProjected[3].y, seatProjected[0].x, seatProjected[0].y, mediumStroke, leftRailHidden ? '4,2' : undefined));
  
  // Component 3: Backrest (3 lines: 2 vertical posts + 1 horizontal top rail at rear)
  const backrestBottomZ = seatHeight;
  const backrestTopZ = height;
  
  const backrestCorners = [
    { x: -w, y: d, z: backrestBottomZ },  // Back-left-bottom
    { x: w, y: d, z: backrestBottomZ },   // Back-right-bottom
    { x: -w, y: d, z: backrestTopZ },     // Back-left-top
    { x: w, y: d, z: backrestTopZ },      // Back-right-top
  ];
  
  const backrestProjected = backrestCorners.map(corner => {
    const proj = isometricProject(corner.x, corner.y, corner.z);
    return { x: centerX + proj.x, y: centerY + proj.y };
  });
  
  // Left post (vertical)
  lines.push(svgLine(backrestProjected[0].x, backrestProjected[0].y, backrestProjected[2].x, backrestProjected[2].y, thickStroke, '4,2'));
  
  // Right post (vertical)
  lines.push(svgLine(backrestProjected[1].x, backrestProjected[1].y, backrestProjected[3].x, backrestProjected[3].y, thickStroke, '4,2'));
  
  // Top rail (horizontal)
  lines.push(svgLine(backrestProjected[2].x, backrestProjected[2].y, backrestProjected[3].x, backrestProjected[3].y, thickStroke, '4,2'));
  
  // Dimension annotations layer (optional overlay)
  const dimensionElements: string[] = [];
  if (showDimensions) {
    const widthPoints = [
      { x: -w, y: -d, z: seatHeight },
      { x: w, y: -d, z: seatHeight }
    ];
    const depthPoints = [
      { x: w, y: -d, z: seatHeight },
      { x: w, y: d, z: seatHeight }
    ];
    const heightPoints = [
      { x: w, y: -d, z: 0 },
      { x: w, y: d, z: backrestTopZ }
    ];
    
    dimensionElements.push(...addDimensionOverlay(
      widthPoints,
      depthPoints,
      heightPoints,
      centerX,
      centerY,
      15,
      2.5
    ));
  }
  
  const allElements = [...lines, ...dimensionElements];
  return `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background: white;">
    ${allElements.join('\n    ')}
  </svg>`;
}

function generateTableFrameRectangular(width: number, depth: number, height: number, showDimensions: boolean = false): string {
  const svgWidth = 400;
  const svgHeight = 400;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2 + 50;
  const lines: string[] = [];
  const w = width / 2;
  const d = depth / 2;
  const tabletopThickness = height * 0.05;
  const tabletopBottomZ = height - tabletopThickness; // Tabletop sits on top of legs
  const topLines = drawIsometricBox(width, depth, tabletopThickness, centerX, centerY, tabletopBottomZ);
  lines.push(...topLines);
  
  // Structural load path: 4 vertical legs at footprint corners
  // Legs extend from floor (z=0) to underside of tabletop (z=tabletopBottomZ)
  const legs = [
    { x: -w * 0.9, y: -d * 0.9 },  // Front-left
    { x: w * 0.9, y: -d * 0.9 },   // Front-right
    { x: w * 0.9, y: d * 0.9 },    // Back-right
    { x: -w * 0.9, y: d * 0.9 },   // Back-left
  ];
  legs.forEach(leg => {
    const legTop = isometricProject(leg.x, leg.y, tabletopBottomZ);
    const legBottom = isometricProject(leg.x, leg.y, 0);
    lines.push(svgLine(centerX + legTop.x, centerY + legTop.y, centerX + legBottom.x, centerY + legBottom.y));
  });
  const railHeight = tabletopBottomZ * 0.3;
  const frontLeftRail = isometricProject(-w * 0.9, -d * 0.9, railHeight);
  const frontRightRail = isometricProject(w * 0.9, -d * 0.9, railHeight);
  lines.push(svgLine(centerX + frontLeftRail.x, centerY + frontLeftRail.y, centerX + frontRightRail.x, centerY + frontRightRail.y));
  const backLeftRail = isometricProject(-w * 0.9, d * 0.9, railHeight);
  const backRightRail = isometricProject(w * 0.9, d * 0.9, railHeight);
  lines.push(svgLine(centerX + backLeftRail.x, centerY + backLeftRail.y, centerX + backRightRail.x, centerY + backRightRail.y));
  
  // Dimension annotations layer (optional overlay) - using reusable helper
  const dimensionElements: string[] = [];
  if (showDimensions) {
    // Define dimension points in 3D space (using tabletop level for width/depth)
    const widthPoints = [
      { x: -w * 0.9, y: -d * 0.9, z: height },  // Front-left-top
      { x: w * 0.9, y: -d * 0.9, z: height }    // Front-right-top
    ];
    const depthPoints = [
      { x: w * 0.9, y: -d * 0.9, z: height },   // Right-front-top
      { x: w * 0.9, y: d * 0.9, z: height }     // Right-back-top
    ];
    const heightPoints = [
      { x: w * 0.9, y: -d * 0.9, z: 0 },        // Floor (front-right)
      { x: w * 0.9, y: -d * 0.9, z: height }    // Top of table
    ];
    
    dimensionElements.push(...addDimensionOverlay(
      widthPoints,
      depthPoints,
      heightPoints,
      centerX,
      centerY,
      15,  // offset
      2.5  // gap
    ));
  }
  
  const allElements = [...lines, ...dimensionElements];
  return `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background: white;">
    ${allElements.join('\n    ')}
  </svg>`;
}

function generateTableFrameRound(width: number, depth: number, height: number, showDimensions: boolean = false): string {
  console.log(`[generateTableFrameRound] Input - width: ${width}, depth: ${depth}, height: ${height}`);
  
  // Validate inputs
  if (!isFinite(width) || !isFinite(depth) || !isFinite(height)) {
    console.error(`[generateTableFrameRound] Invalid input - width: ${width}, depth: ${depth}, height: ${height}`);
    throw new Error(`Invalid dimensions: width=${width}, depth=${depth}, height=${height}`);
  }
  if (width <= 0 || depth <= 0 || height <= 0) {
    console.error(`[generateTableFrameRound] Non-positive dimensions - width: ${width}, depth: ${depth}, height: ${height}`);
    throw new Error(`Non-positive dimensions: width=${width}, depth=${depth}, height=${height}`);
  }
  
  const svgWidth = 400;
  const svgHeight = 400;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2 + 50;
  
  try {
    // ============================================================
    // 1) SINGLE AUTHORITATIVE COORDINATE SYSTEM
    // ============================================================
    const radius = Math.min(width, depth) / 2;
    const tabletopThickness = height * 0.05;
    const legHeight = height - tabletopThickness;
    const baseRadius = radius * 0.3;
    const baseZ = legHeight * 0.2;
    
    // Z coordinates (authoritative)
    const bottomZ = 0;
    const baseTopZ = baseZ;
    const legTopZ = height - tabletopThickness;
    const tabletopBottomZ = legTopZ;
    const tabletopTopZ = height;
    
    // Line Weight Hierarchy (MUST MATCH BASELINES):
    // THICK (3.0px): Outer silhouette only (tabletop rim - dominant silhouette)
    // MEDIUM (2.2px): Central pedestal, base circle
    // THIN (1.0px): Vertical connectors, minor details
    // DASHED THIN (1.0px): Hidden edges only (if any)
    const thickStroke = 3.0;
    const mediumStroke = 2.2;
    const thinStroke = 1.0;
    
    // ============================================================
    // 2) BUILD IN EXACT ORDER: Tabletop → Pedestal → Base → Verticals → Hidden Edges
    // ============================================================
    const allLines: string[] = [];
    const segments = 32;
    
    // ============================================================
    // STEP 1: TABLETOP RIM (outer silhouette - THICK)
    // ============================================================
    const topCirclePoints: string[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const topProj = isometricProject(x, y, tabletopTopZ);
      topCirclePoints.push(`${centerX + topProj.x},${centerY + topProj.y}`);
    }
    // Tabletop rim - THICK (dominant silhouette)
    allLines.push(`<polyline points="${topCirclePoints.join(' ')}" stroke="black" stroke-width="${thickStroke}" stroke-linecap="round" fill="none"/>`);
    
    // ============================================================
    // STEP 2: TABLETOP BOTTOM RIM (visible edge - MEDIUM)
    // ============================================================
    const bottomCirclePoints: string[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const bottomProj = isometricProject(x, y, tabletopBottomZ);
      bottomCirclePoints.push(`${centerX + bottomProj.x},${centerY + bottomProj.y}`);
    }
    // Tabletop bottom rim - MEDIUM (secondary structure)
    allLines.push(`<polyline points="${bottomCirclePoints.join(' ')}" stroke="black" stroke-width="${mediumStroke}" stroke-linecap="round" fill="none"/>`);
    
    // ============================================================
    // STEP 3: TABLETOP VERTICAL CONNECTORS (THIN - showing thickness)
    // ============================================================
    // Draw vertical connectors at regular intervals to show tabletop thickness
    for (let i = 0; i <= segments; i += 8) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const topProj = isometricProject(x, y, tabletopTopZ);
      const bottomProj = isometricProject(x, y, tabletopBottomZ);
      // Only draw visible connectors (front and right sides)
      // Hidden edges (back and left) would be dashed, but for round table we keep it simple
      if (y <= 0 || x >= 0) { // Front or right side (visible)
        allLines.push(svgLine(centerX + topProj.x, centerY + topProj.y, centerX + bottomProj.x, centerY + bottomProj.y, thinStroke));
      }
    }
    
    // ============================================================
    // STEP 4: CENTRAL PEDESTAL (MEDIUM - major structural element)
    // ============================================================
    const legTop = isometricProject(0, 0, legTopZ);
    const legBottom = isometricProject(0, 0, bottomZ);
    // Central pedestal - MEDIUM (major structural element)
    allLines.push(svgLine(centerX + legTop.x, centerY + legTop.y, centerX + legBottom.x, centerY + legBottom.y, mediumStroke));
    
    // ============================================================
    // STEP 5: BASE CIRCLE (MEDIUM - secondary structure)
    // ============================================================
    const basePoints: string[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * baseRadius;
      const y = Math.sin(angle) * baseRadius;
      const baseProj = isometricProject(x, y, baseTopZ);
      basePoints.push(`${centerX + baseProj.x},${centerY + baseProj.y}`);
    }
    // Base circle - MEDIUM (secondary structure)
    allLines.push(`<polyline points="${basePoints.join(' ')}" stroke="black" stroke-width="${mediumStroke}" stroke-linecap="round" fill="none"/>`);
    
    // ============================================================
    // STEP 6: DIMENSION ANNOTATIONS (optional overlay)
    // ============================================================
    const dimensionElements: string[] = [];
    if (showDimensions) {
      // Define dimension points in 3D space (using tabletop level for width/depth)
      // For round tables, use diameter points
      const widthPoints = [
        { x: -radius, y: 0, z: tabletopTopZ },  // Left-center-top
        { x: radius, y: 0, z: tabletopTopZ }    // Right-center-top
      ];
      const depthPoints = [
        { x: 0, y: -radius, z: tabletopTopZ },  // Front-center-top
        { x: 0, y: radius, z: tabletopTopZ }    // Back-center-top
      ];
      const heightPoints = [
        { x: radius, y: 0, z: bottomZ },        // Floor (right-center)
        { x: radius, y: 0, z: tabletopTopZ }    // Top of table
      ];
      
      dimensionElements.push(...addDimensionOverlay(
        widthPoints,
        depthPoints,
        heightPoints,
        centerX,
        centerY,
        15,  // offset
        2.5  // gap
      ));
    }
    
    const allElements = [...allLines, ...dimensionElements];
    return `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}">
    <rect width="${svgWidth}" height="${svgHeight}" fill="white"/>
    ${allElements.join('\n    ')}
  </svg>`;
  } catch (error: any) {
    console.error(`[generateTableFrameRound] Exception:`, error);
    throw error;
  }
}

function generateBenchFrame(width: number, depth: number, height: number, showDimensions: boolean = false): string {
  const svgWidth = 400;
  const svgHeight = 400;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2 + 50;
  const lines: string[] = [];
  const w = width / 2;
  const d = depth / 2;
  // Structural load path: Seat must be raised and supported by legs
  // Seat sits above floor, supported by 4 vertical legs at corners
  const seatThickness = height * 0.15;
  const seatBottomZ = height * 0.2; // Seat raised above floor
  const seatTopZ = seatBottomZ + seatThickness;
  
  // Draw seat box at raised position
  const seatLines = drawIsometricBox(width, depth, seatThickness, centerX, centerY, seatBottomZ);
  lines.push(...seatLines);
  
  // Structural load path: 4 vertical legs from floor (z=0) to underside of seat (z=seatBottomZ)
  const legs = [
    { x: -w * 0.85, y: -d * 0.85 },  // Front-left
    { x: w * 0.85, y: -d * 0.85 },   // Front-right
    { x: w * 0.85, y: d * 0.85 },    // Back-right
    { x: -w * 0.85, y: d * 0.85 },   // Back-left
  ];
  legs.forEach(leg => {
    const legTop = isometricProject(leg.x, leg.y, seatBottomZ);
    const legBottom = isometricProject(leg.x, leg.y, 0);
    lines.push(svgLine(centerX + legTop.x, centerY + legTop.y, centerX + legBottom.x, centerY + legBottom.y));
  });
  
  const legHeight = seatBottomZ; // Leg height is now seatBottomZ
  const railHeight = legHeight * 0.5;
  const frontLeftRail = isometricProject(-w * 0.85, -d * 0.85, railHeight);
  const frontRightRail = isometricProject(w * 0.85, -d * 0.85, railHeight);
  lines.push(svgLine(centerX + frontLeftRail.x, centerY + frontLeftRail.y, centerX + frontRightRail.x, centerY + frontRightRail.y));
  const backLeftRail = isometricProject(-w * 0.85, d * 0.85, railHeight);
  const backRightRail = isometricProject(w * 0.85, d * 0.85, railHeight);
  lines.push(svgLine(centerX + backLeftRail.x, centerY + backLeftRail.y, centerX + backRightRail.x, centerY + backRightRail.y));
  
  // Dimension annotations layer (optional overlay) - using reusable helper
  const dimensionElements: string[] = [];
  if (showDimensions) {
    // Define dimension points in 3D space (using seat top level for width/depth)
    const widthPoints = [
      { x: -w * 0.85, y: -d * 0.85, z: seatTopZ },  // Front-left-seat-top
      { x: w * 0.85, y: -d * 0.85, z: seatTopZ }    // Front-right-seat-top
    ];
    const depthPoints = [
      { x: w * 0.85, y: -d * 0.85, z: seatTopZ },   // Right-front-seat-top
      { x: w * 0.85, y: d * 0.85, z: seatTopZ }     // Right-back-seat-top
    ];
    const heightPoints = [
      { x: w * 0.85, y: -d * 0.85, z: 0 },          // Floor (front-right)
      { x: w * 0.85, y: -d * 0.85, z: seatTopZ }    // Top of seat
    ];
    
    dimensionElements.push(...addDimensionOverlay(
      widthPoints,
      depthPoints,
      heightPoints,
      centerX,
      centerY,
      15,  // offset
      2.5  // gap
    ));
  }
  
  const allElements = [...lines, ...dimensionElements];
  return `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background: white;">
    ${allElements.join('\n    ')}
  </svg>`;
}

function generateBedFrame(width: number, depth: number, height: number, showDimensions: boolean = false): string {
  console.log(`[generateBedFrame] Input - width: ${width}, depth: ${depth}, height: ${height}`);
  
  // Validate inputs
  if (!isFinite(width) || !isFinite(depth) || !isFinite(height)) {
    console.error(`[generateBedFrame] Invalid input - width: ${width}, depth: ${depth}, height: ${height}`);
    throw new Error(`Invalid dimensions: width=${width}, depth=${depth}, height=${height}`);
  }
  if (width <= 0 || depth <= 0 || height <= 0) {
    console.error(`[generateBedFrame] Non-positive dimensions - width: ${width}, depth: ${depth}, height: ${height}`);
    throw new Error(`Non-positive dimensions: width=${width}, depth=${depth}, height=${height}`);
  }
  
  const svgWidth = 600;
  const svgHeight = 500;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2 + 80;
  
  try {
    // ============================================================
    // 1) SINGLE AUTHORITATIVE COORDINATE SYSTEM
    // ============================================================
    const dims = {
      W: width,
      D: depth,
      baseH: height * 0.1,  // Base platform height (10% of total height)
      headboardH: height * 0.9, // Headboard height (90% of total height)
    };
    
    // Z coordinates (authoritative)
    const baseBottomZ = 0;
    const baseTopZ = dims.baseH;
    const headboardBottomZ = dims.baseH;
    const headboardTopZ = dims.baseH + dims.headboardH;
    
    // Half-dimensions for coordinate calculations
    const W2 = dims.W / 2;
    const D2 = dims.D / 2;
    
    // Line Weight Hierarchy (MUST MATCH BASELINES):
    // THICK (3.0px): Outer silhouette only (main box perimeter)
    // MEDIUM (2.2px): Major divisions (if any internal structure)
    // THIN (1.0px): Minor details
    // DASHED THIN (1.0px): Hidden edges only
    const thickStroke = 3.0;
    const mediumStroke = 2.2;
    const thinStroke = 1.0;
    
    // ============================================================
    // 2) BUILD IN EXACT ORDER: Base → Verticals → Headboard → Hidden Edges
    // ============================================================
    const allLines: string[] = [];
    
    // ============================================================
    // STEP 1: BASE PLATFORM (low box frame - like shallow sideboard carcass)
    // ============================================================
    const baseCorners = [
      { x: -W2, y: -D2, z: baseBottomZ }, // Front-left-bottom
      { x: W2, y: -D2, z: baseBottomZ },  // Front-right-bottom
      { x: W2, y: D2, z: baseBottomZ },   // Back-right-bottom
      { x: -W2, y: D2, z: baseBottomZ },  // Back-left-bottom
      { x: -W2, y: -D2, z: baseTopZ },    // Front-left-top
      { x: W2, y: -D2, z: baseTopZ },      // Front-right-top
      { x: W2, y: D2, z: baseTopZ },       // Back-right-top
      { x: -W2, y: D2, z: baseTopZ },      // Back-left-top
    ];
    
    const baseProjected = baseCorners.map(c => {
      const p = isometricProject(c.x, c.y, c.z);
      return { x: centerX + p.x, y: centerY + p.y };
    });
    
    // Base bottom face (4 edges) - THICK for external outline
    allLines.push(svgLine(baseProjected[0].x, baseProjected[0].y, baseProjected[1].x, baseProjected[1].y, thickStroke)); // Front
    allLines.push(svgLine(baseProjected[1].x, baseProjected[1].y, baseProjected[2].x, baseProjected[2].y, thickStroke)); // Right
    // Back edge: DASHED THIN (hidden edge, uniform spacing)
    allLines.push(svgLine(baseProjected[2].x, baseProjected[2].y, baseProjected[3].x, baseProjected[3].y, thinStroke, '4,2')); // Back (dashed)
    allLines.push(svgLine(baseProjected[3].x, baseProjected[3].y, baseProjected[0].x, baseProjected[0].y, thickStroke)); // Left
    
    // Base top face (4 edges) - THICK for external outline
    allLines.push(svgLine(baseProjected[4].x, baseProjected[4].y, baseProjected[5].x, baseProjected[5].y, thickStroke)); // Front
    allLines.push(svgLine(baseProjected[5].x, baseProjected[5].y, baseProjected[6].x, baseProjected[6].y, thickStroke)); // Right
    // Back edge: DASHED THIN (hidden edge, uniform spacing)
    allLines.push(svgLine(baseProjected[6].x, baseProjected[6].y, baseProjected[7].x, baseProjected[7].y, thinStroke, '4,2')); // Back (dashed)
    allLines.push(svgLine(baseProjected[7].x, baseProjected[7].y, baseProjected[4].x, baseProjected[4].y, thickStroke)); // Left
    
    // Base verticals (4 edges) - THICK for external outline
    allLines.push(svgLine(baseProjected[0].x, baseProjected[0].y, baseProjected[4].x, baseProjected[4].y, thickStroke)); // Front-left
    allLines.push(svgLine(baseProjected[1].x, baseProjected[1].y, baseProjected[5].x, baseProjected[5].y, thickStroke)); // Front-right
    // Back verticals: DASHED THIN (hidden edges, uniform spacing)
    allLines.push(svgLine(baseProjected[2].x, baseProjected[2].y, baseProjected[6].x, baseProjected[6].y, thinStroke, '4,2')); // Back-right (dashed)
    allLines.push(svgLine(baseProjected[3].x, baseProjected[3].y, baseProjected[7].x, baseProjected[7].y, thinStroke, '4,2')); // Back-left (dashed)
    
    // ============================================================
    // STEP 2: HEADBOARD PANEL (vertical rear panel - like sideboard side panel)
    // ============================================================
    // Headboard sits at rear edge (y = D2), extends from baseTopZ to headboardTopZ
    // Headboard width spans most of bed width (90% for visual balance)
    const headboardW2 = W2 * 0.9;
    
    const headboardCorners = [
      { x: -headboardW2, y: D2, z: headboardBottomZ }, // Bottom-left
      { x: headboardW2, y: D2, z: headboardBottomZ },  // Bottom-right
      { x: headboardW2, y: D2, z: headboardTopZ },      // Top-right
      { x: -headboardW2, y: D2, z: headboardTopZ },      // Top-left
    ];
    
    const headboardProjected = headboardCorners.map(c => {
      const p = isometricProject(c.x, c.y, c.z);
      return { x: centerX + p.x, y: centerY + p.y };
    });
    
    // Headboard front face (visible, at y = D2) - THICK for external outline
    // Bottom edge (connects to base top)
    allLines.push(svgLine(headboardProjected[0].x, headboardProjected[0].y, headboardProjected[1].x, headboardProjected[1].y, thickStroke)); // Bottom
    // Right vertical
    allLines.push(svgLine(headboardProjected[1].x, headboardProjected[1].y, headboardProjected[2].x, headboardProjected[2].y, thickStroke)); // Right
    // Top edge
    allLines.push(svgLine(headboardProjected[2].x, headboardProjected[2].y, headboardProjected[3].x, headboardProjected[3].y, thickStroke)); // Top
    // Left vertical
    allLines.push(svgLine(headboardProjected[3].x, headboardProjected[3].y, headboardProjected[0].x, headboardProjected[0].y, thickStroke)); // Left
    
    // ============================================================
    // STEP 3: DIMENSION ANNOTATIONS (optional overlay)
    // ============================================================
    const dimensionElements: string[] = [];
    if (showDimensions) {
      const widthPoints = [
        { x: -W2, y: -D2, z: headboardTopZ },
        { x: W2, y: -D2, z: headboardTopZ }
      ];
      const depthPoints = [
        { x: W2, y: -D2, z: headboardTopZ },
        { x: W2, y: D2, z: headboardTopZ }
      ];
      const heightPoints = [
        { x: W2, y: -D2, z: baseBottomZ },
        { x: W2, y: -D2, z: headboardTopZ }
      ];
      
      dimensionElements.push(...addDimensionOverlay(
        widthPoints,
        depthPoints,
        heightPoints,
        centerX,
        centerY,
        15,
        2.5
      ));
    }
    
    const allElements = [...allLines, ...dimensionElements];
    return `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}">
    <rect width="${svgWidth}" height="${svgHeight}" fill="white"/>
    ${allElements.join('\n    ')}
  </svg>`;
  } catch (error: any) {
    console.error(`[generateBedFrame] Exception:`, error);
    throw error;
  }
}

function generateBookshelfFrame(width: number, depth: number, height: number, showDimensions: boolean = false): string {
  console.log(`[generateBookshelfFrame] Input - width: ${width}, depth: ${depth}, height: ${height}`);
  
  // Validate inputs
  if (!isFinite(width) || !isFinite(depth) || !isFinite(height)) {
    console.error(`[generateBookshelfFrame] Invalid input - width: ${width}, depth: ${depth}, height: ${height}`);
    throw new Error(`Invalid dimensions: width=${width}, depth=${depth}, height=${height}`);
  }
  if (width <= 0 || depth <= 0 || height <= 0) {
    console.error(`[generateBookshelfFrame] Non-positive dimensions - width: ${width}, depth: ${depth}, height: ${height}`);
    throw new Error(`Non-positive dimensions: width=${width}, depth=${depth}, height=${height}`);
  }
  
  const svgWidth = 400;
  const svgHeight = 500;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2 + 100;
  
  try {
    // ============================================================
    // 1) SINGLE AUTHORITATIVE COORDINATE SYSTEM
    // ============================================================
    const dims = {
      W: width,
      D: depth,
      H: height,
    };
    
    // Z coordinates (authoritative)
    const bottomZ = 0;
    const topZ = dims.H;
    
    // Half-dimensions for coordinate calculations
    const W2 = dims.W / 2;
    const D2 = dims.D / 2;
    
    // Line Weight Hierarchy (MUST MATCH BASELINES):
    // THICK (3.0px): Outer silhouette only (main box perimeter)
    // MEDIUM (2.2px): Major divisions (if any internal structure)
    // THIN (1.0px): Shelf lines, minor details
    // DASHED THIN (1.0px): Hidden edges only
    const thickStroke = 3.0;
    const mediumStroke = 2.2;
    const thinStroke = 1.0;
    
    // ============================================================
    // 2) BUILD IN EXACT ORDER: Outer Frame → Verticals → Shelves → Hidden Edges
    // ============================================================
    const allLines: string[] = [];
    
    // ============================================================
    // STEP 1: OUTER FRAME (all 12 edges explicitly drawn - like sideboard carcass)
    // ============================================================
    const frameCorners = [
      { x: -W2, y: -D2, z: bottomZ }, // Front-left-bottom
      { x: W2, y: -D2, z: bottomZ },  // Front-right-bottom
      { x: W2, y: D2, z: bottomZ },   // Back-right-bottom
      { x: -W2, y: D2, z: bottomZ },  // Back-left-bottom
      { x: -W2, y: -D2, z: topZ },    // Front-left-top
      { x: W2, y: -D2, z: topZ },      // Front-right-top
      { x: W2, y: D2, z: topZ },       // Back-right-top
      { x: -W2, y: D2, z: topZ },      // Back-left-top
    ];
    
    const frameProjected = frameCorners.map(c => {
      const p = isometricProject(c.x, c.y, c.z);
      return { x: centerX + p.x, y: centerY + p.y };
    });
    
    // Outer frame - THICK for external outline (ONE line per edge, precise corners)
    // Bottom rails (4 edges)
    allLines.push(svgLine(frameProjected[0].x, frameProjected[0].y, frameProjected[1].x, frameProjected[1].y, thickStroke)); // Front (THICK)
    allLines.push(svgLine(frameProjected[1].x, frameProjected[1].y, frameProjected[2].x, frameProjected[2].y, thickStroke)); // Right (THICK)
    // Back bottom rail: DASHED THIN (hidden edge, uniform spacing)
    allLines.push(svgLine(frameProjected[2].x, frameProjected[2].y, frameProjected[3].x, frameProjected[3].y, thinStroke, '4,2')); // Back (dashed)
    allLines.push(svgLine(frameProjected[3].x, frameProjected[3].y, frameProjected[0].x, frameProjected[0].y, thickStroke)); // Left (THICK)
    
    // Top rails (4 edges) - THICK for external outline
    allLines.push(svgLine(frameProjected[4].x, frameProjected[4].y, frameProjected[5].x, frameProjected[5].y, thickStroke)); // Front top edge
    allLines.push(svgLine(frameProjected[5].x, frameProjected[5].y, frameProjected[6].x, frameProjected[6].y, thickStroke)); // Right top edge
    // Back top rail: DASHED THIN (hidden edge, uniform spacing)
    allLines.push(svgLine(frameProjected[6].x, frameProjected[6].y, frameProjected[7].x, frameProjected[7].y, thinStroke, '4,2')); // Back (dashed)
    allLines.push(svgLine(frameProjected[7].x, frameProjected[7].y, frameProjected[4].x, frameProjected[4].y, thickStroke)); // Left (THICK)
    
    // Vertical corner posts (4 edges) - THICK for external outline
    allLines.push(svgLine(frameProjected[0].x, frameProjected[0].y, frameProjected[4].x, frameProjected[4].y, thickStroke)); // Front-left (THICK)
    allLines.push(svgLine(frameProjected[1].x, frameProjected[1].y, frameProjected[5].x, frameProjected[5].y, thickStroke)); // Front-right (THICK)
    // Back verticals: DASHED THIN (hidden edges, uniform spacing)
    allLines.push(svgLine(frameProjected[2].x, frameProjected[2].y, frameProjected[6].x, frameProjected[6].y, thinStroke, '4,2')); // Back-right (dashed)
    allLines.push(svgLine(frameProjected[3].x, frameProjected[3].y, frameProjected[7].x, frameProjected[7].y, thinStroke, '4,2')); // Back-left (dashed)
    
    // ============================================================
    // STEP 2: INTERNAL SHELVES (horizontal rails - like sideboard internal shelves)
    // ============================================================
    // Calculate shelf positions (evenly spaced, minimum 3 shelves)
    const minShelfCount = 3;
    const maxShelfCount = Math.max(minShelfCount, Math.floor(height / 30)); // Approximate shelf spacing
    const shelfCount = Math.min(maxShelfCount, 6); // Cap at 6 shelves for clarity
    
    const shelfThickness = dims.H * 0.02; // ~2% of height (shelf thickness)
    const shelfSpacing = dims.H / (shelfCount + 1);
    
    for (let i = 1; i <= shelfCount; i++) {
      const shelfZ = shelfSpacing * i;
      
      // Shelf top surface corners (connecting to vertical posts)
      const shelfTopCorners = [
        { x: -W2, y: -D2, z: shelfZ + shelfThickness }, // Front-left-top
        { x: W2, y: -D2, z: shelfZ + shelfThickness }, // Front-right-top
        { x: W2, y: D2, z: shelfZ + shelfThickness }, // Back-right-top
        { x: -W2, y: D2, z: shelfZ + shelfThickness },  // Back-left-top
      ];
      
      const shelfTopProjected = shelfTopCorners.map(c => {
        const p = isometricProject(c.x, c.y, c.z);
        return { x: centerX + p.x, y: centerY + p.y };
      });
      
      // Shelf top surface edges - THIN (shelf lines, like sideboard internal shelves)
      allLines.push(svgLine(shelfTopProjected[0].x, shelfTopProjected[0].y, shelfTopProjected[1].x, shelfTopProjected[1].y, thinStroke)); // Front (solid, visible)
      allLines.push(svgLine(shelfTopProjected[1].x, shelfTopProjected[1].y, shelfTopProjected[2].x, shelfTopProjected[2].y, thinStroke)); // Right (solid, visible)
      // Back edge: DASHED THIN (hidden edge, uniform spacing)
      allLines.push(svgLine(shelfTopProjected[2].x, shelfTopProjected[2].y, shelfTopProjected[3].x, shelfTopProjected[3].y, thinStroke, '4,2')); // Back (dashed)
      allLines.push(svgLine(shelfTopProjected[3].x, shelfTopProjected[3].y, shelfTopProjected[0].x, shelfTopProjected[0].y, thinStroke)); // Left (solid, visible)
      
      // Shelf front vertical edges (showing thickness) - THIN
      const shelfBottomCorners = [
        { x: -W2, y: -D2, z: shelfZ },
        { x: W2, y: -D2, z: shelfZ },
      ];
      const shelfBottomProjected = shelfBottomCorners.map(c => {
        const p = isometricProject(c.x, c.y, c.z);
        return { x: centerX + p.x, y: centerY + p.y };
      });
      
      allLines.push(svgLine(shelfTopProjected[0].x, shelfTopProjected[0].y, shelfBottomProjected[0].x, shelfBottomProjected[0].y, thinStroke)); // Front-left vertical
      allLines.push(svgLine(shelfTopProjected[1].x, shelfTopProjected[1].y, shelfBottomProjected[1].x, shelfBottomProjected[1].y, thinStroke)); // Front-right vertical
    }
    
    // ============================================================
    // STEP 3: DIMENSION ANNOTATIONS (optional overlay)
    // ============================================================
    const dimensionElements: string[] = [];
    if (showDimensions) {
      const widthPoints = [
        { x: -W2, y: -D2, z: topZ },
        { x: W2, y: -D2, z: topZ }
      ];
      const depthPoints = [
        { x: W2, y: -D2, z: topZ },
        { x: W2, y: D2, z: topZ }
      ];
      const heightPoints = [
        { x: W2, y: -D2, z: bottomZ },
        { x: W2, y: -D2, z: topZ }
      ];
      
      dimensionElements.push(...addDimensionOverlay(
        widthPoints,
        depthPoints,
        heightPoints,
        centerX,
        centerY,
        15,
        2.5
      ));
    }
    
    const allElements = [...allLines, ...dimensionElements];
    return `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}">
    <rect width="${svgWidth}" height="${svgHeight}" fill="white"/>
    ${allElements.join('\n    ')}
  </svg>`;
  } catch (error: any) {
    console.error(`[generateBookshelfFrame] Exception:`, error);
    throw error;
  }
}

/**
 * Generate placeholder SVG with error message
 */
function generateErrorSVG(errorMessage: string): string {
  return `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg" style="background: white;">
    <text x="200" y="200" font-family="Arial, sans-serif" font-size="12" fill="red" text-anchor="middle">ERROR: ${errorMessage}</text>
  </svg>`;
}

function generateBlueprintSVG(spec: CarpenterSpec, category?: string, itemName?: string): string {
  const { width_cm, depth_cm, height_cm } = spec.dimensions;
  const scale = 2;
  const width = width_cm * scale;
  const depth = depth_cm * scale;
  const height = height_cm * scale;
  
  // Resolve blueprint type deterministically using enum
  const blueprintType = resolveBlueprintType(
    itemName || '',
    category,
    width_cm,
    depth_cm
  );
  
  console.log(`[generateBlueprintSVG] BlueprintType: ${blueprintType}, width_cm: ${width_cm}, depth_cm: ${depth_cm}, height_cm: ${height_cm}`);
  console.log(`[generateBlueprintSVG] Scaled dimensions - width: ${width}, depth: ${depth}, height: ${height}`);
  
  // Route generators ONLY via BlueprintType enum with diagnostic try/catch
  let svgResult: string;
  try {
    switch (blueprintType) {
      case BlueprintType.CHAIR_SINGLE:
        console.log(`[generateBlueprintSVG] Calling generateChairFrame`);
        svgResult = generateChairFrame(width, depth, height, category, itemName);
        break;
    case BlueprintType.SOFA_MULTI:
      console.log(`[generateBlueprintSVG] Calling generateSofaMultiFrame`);
      // Pass cm values directly (no pre-scaling needed)
      svgResult = generateSofaMultiFrame(width_cm, depth_cm, height_cm);
      break;
      case BlueprintType.TABLE_RECT:
        console.log(`[generateBlueprintSVG] Calling generateTableFrameRectangular`);
        svgResult = generateTableFrameRectangular(width, depth, height);
        break;
      case BlueprintType.TABLE_ROUND:
        console.log(`[generateBlueprintSVG] Calling generateTableFrameRound`);
        svgResult = generateTableFrameRound(width, depth, height);
        break;
      case BlueprintType.BENCH:
        console.log(`[generateBlueprintSVG] Calling generateBenchFrame`);
        svgResult = generateBenchFrame(width, depth, height);
        break;
      case BlueprintType.STORAGE_BOX:
        console.log(`[generateBlueprintSVG] Calling generateBoxFrame`);
        svgResult = generateBoxFrame(width, depth, height);
        break;
      case BlueprintType.BED:
        console.log(`[generateBlueprintSVG] Calling generateBedFrame`);
        svgResult = generateBedFrame(width, depth, height);
        break;
      case BlueprintType.BOOKSHELF:
        console.log(`[generateBlueprintSVG] Calling generateBookshelfFrame`);
        svgResult = generateBookshelfFrame(width, depth, height);
        break;
      default:
        console.log(`[generateBlueprintSVG] Default case, calling generateBoxFrame`);
        svgResult = generateBoxFrame(width, depth, height);
    }
    
    // Validate SVG result
    if (svgResult === undefined) {
      console.error(`[generateBlueprintSVG] SVG result is undefined for ${blueprintType}`);
      return generateErrorSVG(`SVG undefined for ${blueprintType}`);
    }
    if (svgResult === null) {
      console.error(`[generateBlueprintSVG] SVG result is null for ${blueprintType}`);
      return generateErrorSVG(`SVG null for ${blueprintType}`);
    }
    if (svgResult === '') {
      console.error(`[generateBlueprintSVG] SVG result is empty string for ${blueprintType}`);
      return generateErrorSVG(`SVG empty for ${blueprintType}`);
    }
    if (svgResult.includes('NaN') || svgResult.includes('Infinity')) {
      console.error(`[generateBlueprintSVG] SVG contains NaN or Infinity for ${blueprintType}`);
      return generateErrorSVG(`SVG contains NaN/Infinity for ${blueprintType}`);
    }
    
    console.log(`[generateBlueprintSVG] SVG generated successfully for ${blueprintType}, length: ${svgResult.length}`);
    return svgResult;
  } catch (error: any) {
    console.error(`[generateBlueprintSVG] Exception generating SVG for ${blueprintType}:`, error);
    console.error(`[generateBlueprintSVG] Error stack:`, error.stack);
    return generateErrorSVG(`${blueprintType} generation failed: ${error.message || error}`);
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
      console.log(`[${requestId}] Calling generateBlueprintSVG with dimensions:`, dimensions);
      const svgString = generateBlueprintSVG(
        carpenterSpec,
        category,
        item_name
      );
      
      console.log(`[${requestId}] SVG string received, length: ${svgString?.length || 0}, type: ${typeof svgString}`);
      
      if (!svgString) {
        console.error(`[${requestId}] SVG string is falsy:`, svgString);
        throw new Error('SVG string is falsy');
      }
      
      // Convert SVG string to data URL (URL-encoded for better compatibility)
      const encodedSvg = encodeURIComponent(svgString);
      const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
      technicalImageUrl = svgDataUrl;
      console.log(`[${requestId}] Successfully generated SVG blueprint diagram, data URL length: ${svgDataUrl.length}`);
    } catch (imageError: any) {
      console.error(`[${requestId}] Error generating SVG blueprint:`, imageError);
      console.error(`[${requestId}] Error stack:`, imageError?.stack);
      console.error(`[${requestId}] Error message:`, imageError?.message);
      // Return placeholder SVG instead of null for diagnostics
      const errorSvg = generateErrorSVG(`Blueprint generation failed: ${imageError?.message || imageError}`);
      const encodedErrorSvg = encodeURIComponent(errorSvg);
      technicalImageUrl = `data:image/svg+xml;charset=utf-8,${encodedErrorSvg}`;
      console.log(`[${requestId}] Returning error placeholder SVG instead of null`);
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