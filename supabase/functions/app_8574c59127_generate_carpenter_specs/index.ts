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
  STORAGE_BOX = 'STORAGE_BOX'
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
  
  // Rule 1: IF width ≥ 180cm → SOFA_MULTI
  if (width_cm >= 180) {
    return BlueprintType.SOFA_MULTI;
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
  
  // Rule 6: ELSE → STORAGE_BOX
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
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" stroke-width="${strokeWidth}" fill="none" ${dashArray}/>`;
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
    
    // Stroke weights
    const frontFaceStrokeWidth = 2.5;
    const dividerStrokeWidth = 2.0;
    const plinthStrokeWidth = 2.0;
    
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
    
    // Plinth bottom face (4 edges)
    allLines.push(svgLine(plinthProjected[0].x, plinthProjected[0].y, plinthProjected[1].x, plinthProjected[1].y, plinthStrokeWidth)); // Front
    allLines.push(svgLine(plinthProjected[1].x, plinthProjected[1].y, plinthProjected[2].x, plinthProjected[2].y, plinthStrokeWidth)); // Right
    const plinthBackHidden = isHiddenEdge(plinthCorners[2], plinthCorners[3]);
    allLines.push(svgLine(plinthProjected[2].x, plinthProjected[2].y, plinthProjected[3].x, plinthProjected[3].y, plinthStrokeWidth, plinthBackHidden ? '3,3' : undefined)); // Back
    allLines.push(svgLine(plinthProjected[3].x, plinthProjected[3].y, plinthProjected[0].x, plinthProjected[0].y, plinthStrokeWidth)); // Left
    
    // Plinth top face (4 edges)
    allLines.push(svgLine(plinthProjected[4].x, plinthProjected[4].y, plinthProjected[5].x, plinthProjected[5].y, plinthStrokeWidth)); // Front
    allLines.push(svgLine(plinthProjected[5].x, plinthProjected[5].y, plinthProjected[6].x, plinthProjected[6].y, plinthStrokeWidth)); // Right
    allLines.push(svgLine(plinthProjected[6].x, plinthProjected[6].y, plinthProjected[7].x, plinthProjected[7].y, plinthStrokeWidth, plinthBackHidden ? '3,3' : undefined)); // Back
    allLines.push(svgLine(plinthProjected[7].x, plinthProjected[7].y, plinthProjected[4].x, plinthProjected[4].y, plinthStrokeWidth)); // Left
    
    // Plinth verticals (4 edges)
    allLines.push(svgLine(plinthProjected[0].x, plinthProjected[0].y, plinthProjected[4].x, plinthProjected[4].y, plinthStrokeWidth)); // Front-left
    allLines.push(svgLine(plinthProjected[1].x, plinthProjected[1].y, plinthProjected[5].x, plinthProjected[5].y, plinthStrokeWidth)); // Front-right
    const plinthBackRightHidden = isHiddenEdge(plinthCorners[2], plinthCorners[6]);
    allLines.push(svgLine(plinthProjected[2].x, plinthProjected[2].y, plinthProjected[6].x, plinthProjected[6].y, plinthStrokeWidth, plinthBackRightHidden ? '3,3' : undefined)); // Back-right
    const plinthBackLeftHidden = isHiddenEdge(plinthCorners[3], plinthCorners[7]);
    allLines.push(svgLine(plinthProjected[3].x, plinthProjected[3].y, plinthProjected[7].x, plinthProjected[7].y, plinthStrokeWidth, plinthBackLeftHidden ? '3,3' : undefined)); // Back-left
    
    // ============================================================
    // STEP 2: CARCASS OUTER FRAME (all 12 edges explicitly drawn)
    // ============================================================
    const wallThickness = dims.W * 0.02; // 2% of width for wall thickness
    
    // Outer carcass corners (full width/depth)
    const carcassCorners = [
      { x: -W2, y: -D2, z: carcassBottomZ }, // Front-left-bottom (outer)
      { x: W2, y: -D2, z: carcassBottomZ },  // Front-right-bottom (outer)
      { x: W2, y: D2, z: carcassBottomZ },   // Back-right-bottom
      { x: -W2, y: D2, z: carcassBottomZ },  // Back-left-bottom
      { x: -W2, y: -D2, z: carcassTopZ },    // Front-left-top (outer)
      { x: W2, y: -D2, z: carcassTopZ },     // Front-right-top (outer)
      { x: W2, y: D2, z: carcassTopZ },      // Back-right-top
      { x: -W2, y: D2, z: carcassTopZ },     // Back-left-top
    ];
    
    // Inner front frame corners (offset inward by wallThickness)
    const innerFrontCorners = [
      { x: -W2 + wallThickness, y: -D2 + wallThickness, z: carcassBottomZ }, // Front-left-bottom (inner)
      { x: W2 - wallThickness, y: -D2 + wallThickness, z: carcassBottomZ },  // Front-right-bottom (inner)
      { x: -W2 + wallThickness, y: -D2 + wallThickness, z: carcassTopZ },    // Front-left-top (inner)
      { x: W2 - wallThickness, y: -D2 + wallThickness, z: carcassTopZ },     // Front-right-top (inner)
    ];
    
    const carcassProjected = carcassCorners.map(c => {
      const p = isometricProject(c.x, c.y, c.z);
      return { x: centerX + p.x, y: centerY + p.y };
    });
    
    const innerFrontProjected = innerFrontCorners.map(c => {
      const p = isometricProject(c.x, c.y, c.z);
      return { x: centerX + p.x, y: centerY + p.y };
    });
    
    // Outer bottom rails (4 edges) - DOMINANT opening frame
    allLines.push(svgLine(carcassProjected[0].x, carcassProjected[0].y, carcassProjected[1].x, carcassProjected[1].y, frontFaceStrokeWidth)); // Front
    allLines.push(svgLine(carcassProjected[1].x, carcassProjected[1].y, carcassProjected[2].x, carcassProjected[2].y, frontFaceStrokeWidth)); // Right
    // Back bottom rail: always dashed (back plane)
    allLines.push(svgLine(carcassProjected[2].x, carcassProjected[2].y, carcassProjected[3].x, carcassProjected[3].y, frontFaceStrokeWidth, '3,3')); // Back (dashed)
    allLines.push(svgLine(carcassProjected[3].x, carcassProjected[3].y, carcassProjected[0].x, carcassProjected[0].y, frontFaceStrokeWidth)); // Left
    
    // Outer top rails (4 edges) - DOMINANT opening frame
    allLines.push(svgLine(carcassProjected[4].x, carcassProjected[4].y, carcassProjected[5].x, carcassProjected[5].y, frontFaceStrokeWidth)); // Front
    allLines.push(svgLine(carcassProjected[5].x, carcassProjected[5].y, carcassProjected[6].x, carcassProjected[6].y, frontFaceStrokeWidth)); // Right
    // Back top rail: always dashed (back plane)
    allLines.push(svgLine(carcassProjected[6].x, carcassProjected[6].y, carcassProjected[7].x, carcassProjected[7].y, frontFaceStrokeWidth, '3,3')); // Back (dashed)
    allLines.push(svgLine(carcassProjected[7].x, carcassProjected[7].y, carcassProjected[4].x, carcassProjected[4].y, frontFaceStrokeWidth)); // Left
    
    // Vertical corner posts (4 edges)
    allLines.push(svgLine(carcassProjected[0].x, carcassProjected[0].y, carcassProjected[4].x, carcassProjected[4].y, frontFaceStrokeWidth)); // Front-left
    allLines.push(svgLine(carcassProjected[1].x, carcassProjected[1].y, carcassProjected[5].x, carcassProjected[5].y, frontFaceStrokeWidth)); // Front-right
    // Back verticals: always dashed (back plane)
    allLines.push(svgLine(carcassProjected[2].x, carcassProjected[2].y, carcassProjected[6].x, carcassProjected[6].y, frontFaceStrokeWidth, '3,3')); // Back-right (dashed)
    allLines.push(svgLine(carcassProjected[3].x, carcassProjected[3].y, carcassProjected[7].x, carcassProjected[7].y, frontFaceStrokeWidth, '3,3')); // Back-left (dashed)
    
    // Inner front frame (wall thickness only - SUBORDINATE, thinner stroke)
    // Inner front bottom rail (thinner to read as wall thickness, not structure)
    allLines.push(svgLine(innerFrontProjected[0].x, innerFrontProjected[0].y, innerFrontProjected[1].x, innerFrontProjected[1].y, dividerStrokeWidth));
    // Inner front top rail (thinner to read as wall thickness, not structure)
    allLines.push(svgLine(innerFrontProjected[2].x, innerFrontProjected[2].y, innerFrontProjected[3].x, innerFrontProjected[3].y, dividerStrokeWidth));
    // Inner front left vertical (thinner to read as wall thickness, not structure)
    allLines.push(svgLine(innerFrontProjected[0].x, innerFrontProjected[0].y, innerFrontProjected[2].x, innerFrontProjected[2].y, dividerStrokeWidth));
    // Inner front right vertical (thinner to read as wall thickness, not structure)
    allLines.push(svgLine(innerFrontProjected[1].x, innerFrontProjected[1].y, innerFrontProjected[3].x, innerFrontProjected[3].y, dividerStrokeWidth));
    
    // Shortened horizontal return edges (read as thickness, not beams)
    // Calculate shortened endpoints: only show ~30% of return edge length
    const returnShortenFactor = 0.3;
    const bottomLeftReturnEnd = {
      x: carcassProjected[0].x + (innerFrontProjected[0].x - carcassProjected[0].x) * returnShortenFactor,
      y: carcassProjected[0].y + (innerFrontProjected[0].y - carcassProjected[0].y) * returnShortenFactor
    };
    const bottomRightReturnEnd = {
      x: carcassProjected[1].x + (innerFrontProjected[1].x - carcassProjected[1].x) * returnShortenFactor,
      y: carcassProjected[1].y + (innerFrontProjected[1].y - carcassProjected[1].y) * returnShortenFactor
    };
    const topLeftReturnEnd = {
      x: carcassProjected[4].x + (innerFrontProjected[2].x - carcassProjected[4].x) * returnShortenFactor,
      y: carcassProjected[4].y + (innerFrontProjected[2].y - carcassProjected[4].y) * returnShortenFactor
    };
    const topRightReturnEnd = {
      x: carcassProjected[5].x + (innerFrontProjected[3].x - carcassProjected[5].x) * returnShortenFactor,
      y: carcassProjected[5].y + (innerFrontProjected[3].y - carcassProjected[5].y) * returnShortenFactor
    };
    
    // Shortened return edges (thinner stroke, read as wall thickness)
    allLines.push(svgLine(carcassProjected[0].x, carcassProjected[0].y, bottomLeftReturnEnd.x, bottomLeftReturnEnd.y, dividerStrokeWidth)); // Bottom-left return
    allLines.push(svgLine(carcassProjected[1].x, carcassProjected[1].y, bottomRightReturnEnd.x, bottomRightReturnEnd.y, dividerStrokeWidth)); // Bottom-right return
    allLines.push(svgLine(carcassProjected[4].x, carcassProjected[4].y, topLeftReturnEnd.x, topLeftReturnEnd.y, dividerStrokeWidth)); // Top-left return
    allLines.push(svgLine(carcassProjected[5].x, carcassProjected[5].y, topRightReturnEnd.x, topRightReturnEnd.y, dividerStrokeWidth)); // Top-right return
    
    // ============================================================
    // STEP 3: INTERNAL SHELF (must terminate into inner carcass frame)
    // ============================================================
    const shelfZ = carcassBottomZ + dims.carcassH * 0.55;
    
    // Shelf aligns with inner front frame (not outer frame)
    // Shelf front edge terminates at inner front frame (y = -D2 + wallThickness)
    // Shelf side edges terminate at inner side walls (x = ±W2 - wallThickness, but sides are at full width)
    // Actually, shelf should span full width between side walls, but front edge at inner frame
    const shelfCorners = [
      { x: -W2, y: -D2 + wallThickness, z: shelfZ }, // Front-left (at inner front frame)
      { x: W2, y: -D2 + wallThickness, z: shelfZ },  // Front-right (at inner front frame)
      { x: W2, y: D2, z: shelfZ },                    // Back-right (at back wall)
      { x: -W2, y: D2, z: shelfZ },                   // Back-left (at back wall)
    ];
    
    const shelfProjected = shelfCorners.map(c => {
      const p = isometricProject(c.x, c.y, c.z);
      return { x: centerX + p.x, y: centerY + p.y };
    });
    
    // Shelf edges (visually subordinate - thinner stroke, back always dashed)
    // Front edge terminates at inner frame (subordinate, not competing with outer frame)
    allLines.push(svgLine(shelfProjected[0].x, shelfProjected[0].y, shelfProjected[1].x, shelfProjected[1].y, dividerStrokeWidth)); // Front (subordinate)
    allLines.push(svgLine(shelfProjected[1].x, shelfProjected[1].y, shelfProjected[2].x, shelfProjected[2].y, dividerStrokeWidth)); // Right (subordinate)
    // Back edge: always dashed (back plane)
    allLines.push(svgLine(shelfProjected[2].x, shelfProjected[2].y, shelfProjected[3].x, shelfProjected[3].y, dividerStrokeWidth, '3,3')); // Back (dashed)
    allLines.push(svgLine(shelfProjected[3].x, shelfProjected[3].y, shelfProjected[0].x, shelfProjected[0].y, dividerStrokeWidth)); // Left (subordinate)
    
    // ============================================================
    // STEP 4: INTERNAL DIVIDERS (must terminate into carcass rails)
    // ============================================================
    // Divider 1: Front-back divider at x = 0 (center width)
    // Front edge terminates at inner front frame (y = -D2 + wallThickness)
    const divider1FrontBottom = { x: 0, y: -D2 + wallThickness, z: carcassBottomZ };
    const divider1FrontTop = { x: 0, y: -D2 + wallThickness, z: carcassTopZ };
    const divider1BackBottom = { x: 0, y: D2, z: carcassBottomZ };
    const divider1BackTop = { x: 0, y: D2, z: carcassTopZ };
    
    const divider1FrontBottomProj = isometricProject(divider1FrontBottom.x, divider1FrontBottom.y, divider1FrontBottom.z);
    const divider1FrontTopProj = isometricProject(divider1FrontTop.x, divider1FrontTop.y, divider1FrontTop.z);
    const divider1BackBottomProj = isometricProject(divider1BackBottom.x, divider1BackBottom.y, divider1BackBottom.z);
    const divider1BackTopProj = isometricProject(divider1BackTop.x, divider1BackTop.y, divider1BackTop.z);
    
    // Front edge: solid (terminates at inner front frame)
    allLines.push(svgLine(
      centerX + divider1FrontBottomProj.x, centerY + divider1FrontBottomProj.y,
      centerX + divider1FrontTopProj.x, centerY + divider1FrontTopProj.y,
      dividerStrokeWidth
    ));
    // Back edge: always dashed (back plane)
    allLines.push(svgLine(
      centerX + divider1BackBottomProj.x, centerY + divider1BackBottomProj.y,
      centerX + divider1BackTopProj.x, centerY + divider1BackTopProj.y,
      dividerStrokeWidth, '3,3'
    ));
    
    // Divider 2: Left-right divider at y = 0 (center depth) - creates compartments
    const divider2LeftBottom = { x: -W2, y: 0, z: carcassBottomZ };
    const divider2LeftTop = { x: -W2, y: 0, z: carcassTopZ };
    const divider2RightBottom = { x: W2, y: 0, z: carcassBottomZ };
    const divider2RightTop = { x: W2, y: 0, z: carcassTopZ };
    
    const divider2LeftBottomProj = isometricProject(divider2LeftBottom.x, divider2LeftBottom.y, divider2LeftBottom.z);
    const divider2LeftTopProj = isometricProject(divider2LeftTop.x, divider2LeftTop.y, divider2LeftTop.z);
    const divider2RightBottomProj = isometricProject(divider2RightBottom.x, divider2RightBottom.y, divider2RightBottom.z);
    const divider2RightTopProj = isometricProject(divider2RightTop.x, divider2RightTop.y, divider2RightTop.z);
    
    allLines.push(svgLine(
      centerX + divider2LeftBottomProj.x, centerY + divider2LeftBottomProj.y,
      centerX + divider2LeftTopProj.x, centerY + divider2LeftTopProj.y,
      dividerStrokeWidth
    ));
    allLines.push(svgLine(
      centerX + divider2RightBottomProj.x, centerY + divider2RightBottomProj.y,
      centerX + divider2RightTopProj.x, centerY + divider2RightTopProj.y,
      dividerStrokeWidth
    ));
    
    // ============================================================
    // 7) VALIDATION INVARIANTS
    // ============================================================
    // Validate all vertical endpoints match horizontal rails
    const allVerticalEndpoints = [
      divider1FrontBottom, divider1FrontTop, divider1BackBottom, divider1BackTop,
      divider2LeftBottom, divider2LeftTop, divider2RightBottom, divider2RightTop,
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
 * Multi-bay sofa using plinth foundation, seat bays, and aligned back supports
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
  
  const svgWidth = 400;
  const svgHeight = 400;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2 + 50;
  const lines: string[] = [];

  const w = width / 2;
  const d = depth / 2;
  const totalHeight = height;
  
  console.log(`[generateSofaMultiFrame] Calculated - w: ${w}, d: ${d}, totalHeight: ${totalHeight}`);

  // Foundation: Plinth base (90% of footprint)
  const plinthThickness = totalHeight * 0.05;
  const plinthW = w * 0.9;
  const plinthD = d * 0.9;
  
  console.log(`[generateSofaMultiFrame] Plinth - thickness: ${plinthThickness}, plinthW: ${plinthW}, plinthD: ${plinthD}`);

  const plinthCorners = [
    { x: -plinthW, y: -plinthD, z: 0 },                // Front-left-bottom
    { x: plinthW, y: -plinthD, z: 0 },                 // Front-right-bottom
    { x: plinthW, y: plinthD, z: 0 },                  // Back-right-bottom
    { x: -plinthW, y: plinthD, z: 0 },                 // Back-left-bottom
    { x: -plinthW, y: -plinthD, z: plinthThickness },  // Front-left-top
    { x: plinthW, y: -plinthD, z: plinthThickness },   // Front-right-top
    { x: plinthW, y: plinthD, z: plinthThickness },    // Back-right-top
    { x: -plinthW, y: plinthD, z: plinthThickness },   // Back-left-top
  ];

  const plinthProjected = plinthCorners.map(corner => {
    const proj = isometricProject(corner.x, corner.y, corner.z);
    return { x: centerX + proj.x, y: centerY + proj.y };
  });

  // Plinth faces and vertical edges (simple wireframe)
  // Bottom
  lines.push(svgLine(plinthProjected[0].x, plinthProjected[0].y, plinthProjected[1].x, plinthProjected[1].y));
  lines.push(svgLine(plinthProjected[1].x, plinthProjected[1].y, plinthProjected[2].x, plinthProjected[2].y));
  lines.push(svgLine(plinthProjected[2].x, plinthProjected[2].y, plinthProjected[3].x, plinthProjected[3].y));
  lines.push(svgLine(plinthProjected[3].x, plinthProjected[3].y, plinthProjected[0].x, plinthProjected[0].y));
  // Top
  lines.push(svgLine(plinthProjected[4].x, plinthProjected[4].y, plinthProjected[5].x, plinthProjected[5].y));
  lines.push(svgLine(plinthProjected[5].x, plinthProjected[5].y, plinthProjected[6].x, plinthProjected[6].y));
  lines.push(svgLine(plinthProjected[6].x, plinthProjected[6].y, plinthProjected[7].x, plinthProjected[7].y));
  lines.push(svgLine(plinthProjected[7].x, plinthProjected[7].y, plinthProjected[4].x, plinthProjected[4].y));
  // Vertical edges - REMOVED corner verticals where arms occupy same (x, y) coordinates
  // Plinth corner verticals at (±plinthW, ±plinthD) are redundant with arm verticals at (±seatW, ±seatD)
  // Since seatW = plinthW and seatD = plinthD, all 4 corner verticals are removed
  // Arms will provide the vertical structure at these corners

  // Seat bays: divide width into bays of ~65cm
  const scale = 2; // 1cm = 2 units (from generateBlueprintSVG)
  const width_cm = width / scale;
  let seatCount = Math.floor(width_cm / 65);
  if (seatCount < 2) seatCount = 2; // Ensure at least 2 bays for sofas
  
  console.log(`[generateSofaMultiFrame] Seat bays - scale: ${scale}, width_cm: ${width_cm}, seatCount: ${seatCount}`);

  const seatHeight = totalHeight * 0.45;
  const seatFrameZ = seatHeight;
  
  console.log(`[generateSofaMultiFrame] Seat frame - seatHeight: ${seatHeight}, seatFrameZ: ${seatFrameZ}`);

  // Seat frame footprint (aligned with plinth)
  const seatW = plinthW;
  const seatD = plinthD;

  // Bay boundaries along X
  const bayWidth = (seatW * 2) / seatCount;
  const bayBoundaries: number[] = [];
  for (let i = 0; i <= seatCount; i++) {
    bayBoundaries.push(-seatW + i * bayWidth);
  }

  // PRIMARY STRUCTURE: Outer seat frame perimeter only (not per-bay)
  // Front rail (continuous)
  const frontLeftProj = isometricProject(-seatW, -seatD, seatFrameZ);
  const frontRightProj = isometricProject(seatW, -seatD, seatFrameZ);
  lines.push(svgLine(centerX + frontLeftProj.x, centerY + frontLeftProj.y, centerX + frontRightProj.x, centerY + frontRightProj.y));
  
  // Back rail (continuous)
  const backLeftProj = isometricProject(-seatW, seatD, seatFrameZ);
  const backRightProj = isometricProject(seatW, seatD, seatFrameZ);
  lines.push(svgLine(centerX + backLeftProj.x, centerY + backLeftProj.y, centerX + backRightProj.x, centerY + backRightProj.y));
  
  // Left side rail (continuous)
  lines.push(svgLine(centerX + frontLeftProj.x, centerY + frontLeftProj.y, centerX + backLeftProj.x, centerY + backLeftProj.y));
  
  // Right side rail (continuous)
  lines.push(svgLine(centerX + frontRightProj.x, centerY + frontRightProj.y, centerX + backRightProj.x, centerY + backRightProj.y));

  // REMOVED: Interior vertical supports (secondary structure that competed with primary silhouette)
  // Primary load paths are provided by: plinth foundation, seat frame perimeter, and arm outer edges

  // Back support: continuous back frame aligned with bay divisions
  // Define backFrameTopZ BEFORE arms (used in addArmFrame)
  const backFrameBottomZ = seatFrameZ;
  const backFrameTopZ = totalHeight;
  
  console.log(`[generateSofaMultiFrame] Back frame - backFrameBottomZ: ${backFrameBottomZ}, backFrameTopZ: ${backFrameTopZ}`);

  // Arm structures: Left and Right arms as vertical rectangular frames
  // Arms aligned to seat frame perimeter (±seatW), span full seat depth, from plinth top to backFrameTopZ
  const armWidth = width * 0.1; // 10% of total width
  const rightArmOuterX = seatW; // Aligned to seat frame, not full width
  const rightArmInnerX = seatW - armWidth;
  const leftArmOuterX = -seatW; // Aligned to seat frame, not full width
  const leftArmInnerX = -seatW + armWidth;
  
  console.log(`[generateSofaMultiFrame] Arms - armWidth: ${armWidth}, leftArmInnerX: ${leftArmInnerX}, leftArmOuterX: ${leftArmOuterX}, rightArmInnerX: ${rightArmInnerX}, rightArmOuterX: ${rightArmOuterX}`);

  function addArmFrame(innerX: number, outerX: number) {
    // Arm corners at three Z levels: plinth top, seat frame, and back top
    // Bottom level (plinth top)
    const armBottomFrontOuter = { x: outerX, y: -seatD, z: plinthThickness };
    const armBottomBackOuter = { x: outerX, y: seatD, z: plinthThickness };
    // Middle level (seat frame - authoritative connection plane)
    const armSeatFrontOuter = { x: outerX, y: -seatD, z: seatFrameZ };
    const armSeatBackOuter = { x: outerX, y: seatD, z: seatFrameZ };
    // Top level (back frame top)
    const armTopFrontOuter = { x: outerX, y: -seatD, z: backFrameTopZ };
    const armTopBackOuter = { x: outerX, y: seatD, z: backFrameTopZ };

    // Project all points
    const projBottomFront = isometricProject(armBottomFrontOuter.x, armBottomFrontOuter.y, armBottomFrontOuter.z);
    const projBottomBack = isometricProject(armBottomBackOuter.x, armBottomBackOuter.y, armBottomBackOuter.z);
    const projSeatFront = isometricProject(armSeatFrontOuter.x, armSeatFrontOuter.y, armSeatFrontOuter.z);
    const projSeatBack = isometricProject(armSeatBackOuter.x, armSeatBackOuter.y, armSeatBackOuter.z);
    const projTopFront = isometricProject(armTopFrontOuter.x, armTopFrontOuter.y, armTopFrontOuter.z);
    const projTopBack = isometricProject(armTopBackOuter.x, armTopBackOuter.y, armTopBackOuter.z);

    // PRIMARY STRUCTURE: Outer vertical edges split into two segments
    // Segment 1: Plinth → Seat frame (foundation to authoritative plane)
    lines.push(svgLine(
      centerX + projBottomFront.x, centerY + projBottomFront.y,
      centerX + projSeatFront.x, centerY + projSeatFront.y
    )); // Front-outer: plinth → seat
    lines.push(svgLine(
      centerX + projBottomBack.x, centerY + projBottomBack.y,
      centerX + projSeatBack.x, centerY + projSeatBack.y
    )); // Back-outer: plinth → seat
    
    // Segment 2: Seat frame → Back top (authoritative plane to back structure)
    lines.push(svgLine(
      centerX + projSeatFront.x, centerY + projSeatFront.y,
      centerX + projTopFront.x, centerY + projTopFront.y
    )); // Front-outer: seat → back top
    lines.push(svgLine(
      centerX + projSeatBack.x, centerY + projSeatBack.y,
      centerX + projTopBack.x, centerY + projTopBack.y
    )); // Back-outer: seat → back top
  }

  // Left and right arms
  addArmFrame(leftArmInnerX, leftArmOuterX);
  addArmFrame(rightArmInnerX, rightArmOuterX);

  // PRIMARY STRUCTURE: Back frame rails (bottom and top)
  // Bottom rail: anchors to seat frame back rail (authoritative connection plane)
  const backBottomLeftProj = isometricProject(-seatW, seatD, backFrameBottomZ);
  const backBottomRightProj = isometricProject(seatW, seatD, backFrameBottomZ);
  lines.push(svgLine(centerX + backBottomLeftProj.x, centerY + backBottomLeftProj.y, centerX + backBottomRightProj.x, centerY + backBottomRightProj.y));
  
  // Top rail: continuous across back structure
  const backTopLeftProj = isometricProject(-seatW, seatD, backFrameTopZ);
  const backTopRightProj = isometricProject(seatW, seatD, backFrameTopZ);
  lines.push(svgLine(centerX + backTopLeftProj.x, centerY + backTopLeftProj.y, centerX + backTopRightProj.x, centerY + backTopRightProj.y));
  
  // REMOVED: Interior vertical back supports (secondary structure that competed with primary silhouette)
  // Back structure is defined by: back frame bottom rail (anchored to seat), top rail, and arm back-outer verticals

  // Dimension annotations layer (optional overlay) - using reusable helper
  const dimensionElements: string[] = [];
  if (showDimensions) {
    const widthPoints = [
      { x: -w, y: -d, z: totalHeight },  // Front-left-top
      { x: w, y: -d, z: totalHeight }    // Front-right-top
    ];
    const depthPoints = [
      { x: w, y: -d, z: totalHeight },   // Right-front-top
      { x: w, y: d, z: totalHeight }     // Right-back-top
    ];
    const heightPoints = [
      { x: w, y: -d, z: 0 },             // Floor (front-right)
      { x: w, y: d, z: backFrameTopZ }   // Top of back frame
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
  
  console.log(`[generateSofaMultiFrame] Final - lines count: ${lines.length}, dimensionElements count: ${dimensionElements.length}, allElements count: ${allElements.length}`);
  
  // Validate all calculated values
  console.log(`[generateSofaMultiFrame] Z values summary - plinthThickness: ${plinthThickness}, seatFrameZ: ${seatFrameZ}, backFrameBottomZ: ${backFrameBottomZ}, backFrameTopZ: ${backFrameTopZ}`);
  console.log(`[generateSofaMultiFrame] Division results - bayWidth: ${bayWidth}, bayBoundaries count: ${bayBoundaries.length}`);
  
  try {
    const svgString = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background: white;">
    ${allElements.join('\n    ')}
  </svg>`;
    
    // Validate SVG string
    if (svgString === undefined) {
      console.error(`[generateSofaMultiFrame] SVG string is undefined`);
      throw new Error('SVG string is undefined');
    }
    if (svgString === null) {
      console.error(`[generateSofaMultiFrame] SVG string is null`);
      throw new Error('SVG string is null');
    }
    if (svgString === '') {
      console.error(`[generateSofaMultiFrame] SVG string is empty`);
      throw new Error('SVG string is empty');
    }
    if (svgString.includes('NaN') || svgString.includes('Infinity')) {
      console.error(`[generateSofaMultiFrame] SVG contains NaN or Infinity`);
      throw new Error('SVG contains NaN or Infinity');
    }
    
    console.log(`[generateSofaMultiFrame] SVG generated successfully, length: ${svgString.length}`);
    return svgString;
  } catch (error: any) {
    console.error(`[generateSofaMultiFrame] Exception during SVG assembly:`, error);
    throw error;
  }
}

/**
 * Determine foundation type based on category keywords
 */
function determineFoundationType(category: string | undefined, itemName: string): 'plinth' | 'leg-frame' {
  const searchText = `${category || ''} ${itemName}`.toLowerCase();
  
  // Leg Frame keywords
  if (searchText.includes('leg') || searchText.includes('traditional') || 
      searchText.includes('classic') || searchText.includes('wooden')) {
    return 'leg-frame';
  }
  
  // Plinth Base keywords (default)
  if (searchText.includes('lounge') || searchText.includes('accent') || 
      searchText.includes('modern') || searchText.includes('contemporary')) {
    return 'plinth';
  }
  
  // Default to Plinth Base if uncertain
  return 'plinth';
}

/**
 * Generate component-based chair blueprint
 * Components: Foundation (Plinth or Leg Frame), Seat Support Frame (Rails), Back Support Frame
 * @param showDimensions - If true, adds dimension annotations (W, D, H) as overlay
 */
function generateChairFrame(width: number, depth: number, height: number, category?: string, itemName?: string, showDimensions: boolean = false): string {
  const svgWidth = 400;
  const svgHeight = 400;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2 + 50;
  const lines: string[] = [];
  
  // Derived dimensions (all from width, depth, height)
  const w = width / 2;
  const d = depth / 2;
  const seatHeight = height * 0.45; // Seat at 45% of total height
  const railThickness = height * 0.03; // Rail thickness
  
  // Determine foundation type
  const foundationType = determineFoundationType(category, itemName || '');
  
  // Render order: Foundation → Legs → Seat Rails → Back Frame
  // Component 1: Foundation (Plinth Base or Leg Frame)
  const foundationLines: string[] = [];
  const legLines: string[] = [];
  const seatRailLines: string[] = [];
  const backFrameLines: string[] = [];
  const internalSupportLines: string[] = [];
  
  if (foundationType === 'plinth') {
    // Plinth Base: Solid rectangular base, 90% of width/depth (5% inset on each side)
    const foundationThickness = height * 0.05;
    const plinthW = w * 0.9; // 90% of width (5% inset each side)
    const plinthD = d * 0.9; // 90% of depth (5% inset each side)
    
    const plinthCorners = [
      { x: -plinthW, y: -plinthD, z: 0 },           // Front-left-bottom
      { x: plinthW, y: -plinthD, z: 0 },            // Front-right-bottom
      { x: plinthW, y: plinthD, z: 0 },              // Back-right-bottom
      { x: -plinthW, y: plinthD, z: 0 },             // Back-left-bottom
      { x: -plinthW, y: -plinthD, z: foundationThickness },  // Front-left-top
      { x: plinthW, y: -plinthD, z: foundationThickness },   // Front-right-top
      { x: plinthW, y: plinthD, z: foundationThickness },    // Back-right-top
      { x: -plinthW, y: plinthD, z: foundationThickness },   // Back-left-top
    ];
    
    const plinthProjected = plinthCorners.map(corner => {
      const proj = isometricProject(corner.x, corner.y, corner.z);
      return { x: centerX + proj.x, y: centerY + proj.y };
    });
    
    // Plinth bottom face (4 edges) - 2.5px solid (outer structural edge)
    const bottomEdges = [
      [plinthCorners[0], plinthCorners[1]], // Front
      [plinthCorners[1], plinthCorners[2]], // Right
      [plinthCorners[2], plinthCorners[3]], // Back
      [plinthCorners[3], plinthCorners[0]], // Left
    ];
    bottomEdges.forEach(([p1, p2], idx) => {
      const hidden = isHiddenEdge(p1, p2);
      foundationLines.push(svgLine(
        plinthProjected[idx].x, plinthProjected[idx].y,
        plinthProjected[(idx + 1) % 4].x, plinthProjected[(idx + 1) % 4].y,
        2.5, hidden ? '3,3' : undefined
      ));
    });
    
    // Plinth top face (4 edges) - 2.5px solid (outer structural edge)
    const topEdges = [
      [plinthCorners[4], plinthCorners[5]], // Front
      [plinthCorners[5], plinthCorners[6]], // Right
      [plinthCorners[6], plinthCorners[7]], // Back
      [plinthCorners[7], plinthCorners[4]], // Left
    ];
    topEdges.forEach(([p1, p2], idx) => {
      const hidden = isHiddenEdge(p1, p2);
      foundationLines.push(svgLine(
        plinthProjected[4 + idx].x, plinthProjected[4 + idx].y,
        plinthProjected[4 + ((idx + 1) % 4)].x, plinthProjected[4 + ((idx + 1) % 4)].y,
        2.5, hidden ? '3,3' : undefined
      ));
    });
    
    // Plinth vertical edges (4 edges) - 2.5px solid (outer structural edge)
    const verticalEdges = [
      [plinthCorners[0], plinthCorners[4]], // Front-left
      [plinthCorners[1], plinthCorners[5]], // Front-right
      [plinthCorners[2], plinthCorners[6]], // Back-right
      [plinthCorners[3], plinthCorners[7]], // Back-left
    ];
    verticalEdges.forEach(([p1, p2], idx) => {
      const hidden = isHiddenEdge(p1, p2);
      foundationLines.push(svgLine(
        plinthProjected[idx].x, plinthProjected[idx].y,
        plinthProjected[4 + idx].x, plinthProjected[4 + idx].y,
        2.5, hidden ? '3,3' : undefined
      ));
    });
  }
  
  // Component 2: Seat Support Frame - Individual Rails at seatHeight
  // Rails form a closed rectangle: Front, Back, Left, Right
  const seatFrameZ = seatHeight; // Seat rails at 45% of total height
  const seatFrameTopZ = seatFrameZ + railThickness;
  
  // Seat rail corners (at exact footprint corners for leg frame, or inset for plinth)
  const seatW = foundationType === 'leg-frame' ? w : w * 0.9; // Full width for legs, inset for plinth
  const seatD = foundationType === 'leg-frame' ? d : d * 0.9; // Full depth for legs, inset for plinth
  
  // Define rail endpoints (corners of seat frame)
  const seatCorners = [
    { x: -seatW, y: -seatD, z: seatFrameZ },      // Front-left-bottom
    { x: seatW, y: -seatD, z: seatFrameZ },        // Front-right-bottom
    { x: seatW, y: seatD, z: seatFrameZ },         // Back-right-bottom
    { x: -seatW, y: seatD, z: seatFrameZ },        // Back-left-bottom
    { x: -seatW, y: -seatD, z: seatFrameTopZ },    // Front-left-top
    { x: seatW, y: -seatD, z: seatFrameTopZ },     // Front-right-top
    { x: seatW, y: seatD, z: seatFrameTopZ },      // Back-right-top
    { x: -seatW, y: seatD, z: seatFrameTopZ },     // Back-left-top
  ];
  
  const seatProjected = seatCorners.map(corner => {
    const proj = isometricProject(corner.x, corner.y, corner.z);
    return { x: centerX + proj.x, y: centerY + proj.y };
  });
  
  // Front Rail (front edge) - 2.5px solid (outer structural edge)
  const frontRailBottom = isHiddenEdge(seatCorners[0], seatCorners[1]) ? '3,3' : undefined;
  const frontRailTop = isHiddenEdge(seatCorners[4], seatCorners[5]) ? '3,3' : undefined;
  seatRailLines.push(svgLine(seatProjected[0].x, seatProjected[0].y, seatProjected[1].x, seatProjected[1].y, 2.5, frontRailBottom));
  seatRailLines.push(svgLine(seatProjected[4].x, seatProjected[4].y, seatProjected[5].x, seatProjected[5].y, 2.5, frontRailTop));
  seatRailLines.push(svgLine(seatProjected[0].x, seatProjected[0].y, seatProjected[4].x, seatProjected[4].y, 2.5, undefined));
  seatRailLines.push(svgLine(seatProjected[1].x, seatProjected[1].y, seatProjected[5].x, seatProjected[5].y, 2.5, undefined));
  
  // Back Rail (back edge) - 2.5px solid (outer structural edge, back is hidden)
  const backRailBottom = isHiddenEdge(seatCorners[2], seatCorners[3]) ? '3,3' : undefined;
  const backRailTop = isHiddenEdge(seatCorners[6], seatCorners[7]) ? '3,3' : undefined;
  seatRailLines.push(svgLine(seatProjected[2].x, seatProjected[2].y, seatProjected[3].x, seatProjected[3].y, 2.5, backRailBottom || '3,3'));
  seatRailLines.push(svgLine(seatProjected[6].x, seatProjected[6].y, seatProjected[7].x, seatProjected[7].y, 2.5, backRailTop || '3,3'));
  seatRailLines.push(svgLine(seatProjected[2].x, seatProjected[2].y, seatProjected[6].x, seatProjected[6].y, 2.5, '3,3'));
  seatRailLines.push(svgLine(seatProjected[3].x, seatProjected[3].y, seatProjected[7].x, seatProjected[7].y, 2.5, '3,3'));
  
  // Explicit rear seat rail at seat plane (seatFrameZ) - mandatory structural termination point
  // This rail connects the two rear vertical posts and anchors the backrest structure
  // Coordinates: x ∈ [-seatW, seatW], y = seatD, z = seatFrameZ
  // This is the same as the bottom back rail, but explicitly defined for backrest anchoring
  const rearSeatRailLeft = { x: -seatW, y: seatD, z: seatFrameZ };
  const rearSeatRailRight = { x: seatW, y: seatD, z: seatFrameZ };
  const rearSeatRailLeftProj = isometricProject(rearSeatRailLeft.x, rearSeatRailLeft.y, rearSeatRailLeft.z);
  const rearSeatRailRightProj = isometricProject(rearSeatRailRight.x, rearSeatRailRight.y, rearSeatRailRight.z);
  const rearSeatRailHidden = isHiddenEdge(rearSeatRailLeft, rearSeatRailRight);
  seatRailLines.push(svgLine(
    centerX + rearSeatRailLeftProj.x, centerY + rearSeatRailLeftProj.y,
    centerX + rearSeatRailRightProj.x, centerY + rearSeatRailRightProj.y,
    2.5, rearSeatRailHidden ? '3,3' : undefined
  ));
  
  // Left Rail (left edge) - 2.5px solid (left is hidden)
  const leftRailBottom = isHiddenEdge(seatCorners[0], seatCorners[3]) ? '3,3' : undefined;
  const leftRailTop = isHiddenEdge(seatCorners[4], seatCorners[7]) ? '3,3' : undefined;
  seatRailLines.push(svgLine(seatProjected[0].x, seatProjected[0].y, seatProjected[3].x, seatProjected[3].y, 2.5, leftRailBottom || '3,3'));
  seatRailLines.push(svgLine(seatProjected[4].x, seatProjected[4].y, seatProjected[7].x, seatProjected[7].y, 2.5, leftRailTop || '3,3'));
  
  // Right Rail (right edge) - 2.5px solid (outer structural edge, right is visible)
  const rightRailBottom = isHiddenEdge(seatCorners[1], seatCorners[2]) ? '3,3' : undefined;
  const rightRailTop = isHiddenEdge(seatCorners[5], seatCorners[6]) ? '3,3' : undefined;
  seatRailLines.push(svgLine(seatProjected[1].x, seatProjected[1].y, seatProjected[2].x, seatProjected[2].y, 2.5, rightRailBottom));
  seatRailLines.push(svgLine(seatProjected[5].x, seatProjected[5].y, seatProjected[6].x, seatProjected[6].y, 2.5, rightRailTop));
  
  // Support connections from Foundation to Seat Rails
  if (foundationType === 'plinth') {
    // Plinth Base: Vertical supports from plinth top to seat rails (4 corners) - 1px dashed (internal supports)
    const plinthThickness = height * 0.05;
    const plinthW = w * 0.9;
    const plinthD = d * 0.9;
    
    const plinthTopCorners = [
      { x: -plinthW, y: -plinthD, z: plinthThickness },
      { x: plinthW, y: -plinthD, z: plinthThickness },
      { x: plinthW, y: plinthD, z: plinthThickness },
      { x: -plinthW, y: plinthD, z: plinthThickness },
    ];
    
    const seatBottomCorners = [
      { x: -seatW, y: -seatD, z: seatFrameZ },
      { x: seatW, y: -seatD, z: seatFrameZ },
      { x: seatW, y: seatD, z: seatFrameZ },
      { x: -seatW, y: seatD, z: seatFrameZ },
    ];
    
    for (let i = 0; i < 4; i++) {
      const plinthProj = isometricProject(plinthTopCorners[i].x, plinthTopCorners[i].y, plinthTopCorners[i].z);
      const seatProj = isometricProject(seatBottomCorners[i].x, seatBottomCorners[i].y, seatBottomCorners[i].z);
      internalSupportLines.push(svgLine(
        centerX + plinthProj.x, centerY + plinthProj.y,
        centerX + seatProj.x, centerY + seatProj.y,
        1, '3,3' // 1px dashed for internal supports
      ));
    }
  } else {
    // Leg Frame: Four vertical legs at exact corners, connecting directly to seat rails
    // 2px solid (load-bearing vertical supports)
    const legCorners = [
      { x: -seatW, y: -seatD, z: 0 },  // Front-left leg bottom
      { x: seatW, y: -seatD, z: 0 },   // Front-right leg bottom
      { x: seatW, y: seatD, z: 0 },    // Back-right leg bottom
      { x: -seatW, y: seatD, z: 0 },   // Back-left leg bottom
    ];
    
    const seatBottomCorners = [
      { x: -seatW, y: -seatD, z: seatFrameZ },
      { x: seatW, y: -seatD, z: seatFrameZ },
      { x: seatW, y: seatD, z: seatFrameZ },
      { x: -seatW, y: seatD, z: seatFrameZ },
    ];
    
    for (let i = 0; i < 4; i++) {
      const legBottomProj = isometricProject(legCorners[i].x, legCorners[i].y, legCorners[i].z);
      const seatBottomProj = isometricProject(seatBottomCorners[i].x, seatBottomCorners[i].y, seatBottomCorners[i].z);
      const hidden = isHiddenEdge(legCorners[i], seatBottomCorners[i]);
      // Leg connects directly to seat rail - 2px solid (load-bearing)
      legLines.push(svgLine(
        centerX + legBottomProj.x, centerY + legBottomProj.y,
        centerX + seatBottomProj.x, centerY + seatBottomProj.y,
        2, hidden ? '3,3' : undefined
      ));
    }
  }
  
  // Component 3: Back Support Frame - Vertical rectangular frame
  // Anchored exactly to rear seat rail at seat plane (seatFrameZ), extends to totalHeight
  // The backrest posts must terminate at the rear seat rail (seatFrameZ) to form a closed structural loop
  const backFrameZ = seatFrameZ; // Starts at seat plane (authoritative connection level)
  const backFrameTopZ = height; // Extends to total height
  
  // Back frame shares corner coordinates with rear seat rail (rear edge of seat frame at seat plane)
  // Rear seat rail corners: (-seatW, seatD, seatFrameZ) and (seatW, seatD, seatFrameZ)
  const backFrameCorners = [
    { x: -seatW, y: seatD, z: backFrameZ },        // Back-left-bottom (anchored to rear seat rail)
    { x: seatW, y: seatD, z: backFrameZ },         // Back-right-bottom (anchored to rear seat rail)
    { x: -seatW, y: seatD, z: backFrameTopZ },     // Back-left-top
    { x: seatW, y: seatD, z: backFrameTopZ },      // Back-right-top
  ];
  
  const backFrameProjected = backFrameCorners.map(corner => {
    const proj = isometricProject(corner.x, corner.y, corner.z);
    return { x: centerX + proj.x, y: centerY + proj.y };
  });
  
  // Back frame vertical edges (2 edges) - 2.5px solid (outer structural edge, back is hidden)
  const leftVerticalHidden = isHiddenEdge(backFrameCorners[0], backFrameCorners[2]);
  const rightVerticalHidden = isHiddenEdge(backFrameCorners[1], backFrameCorners[3]);
  backFrameLines.push(svgLine(backFrameProjected[0].x, backFrameProjected[0].y, backFrameProjected[2].x, backFrameProjected[2].y, 2.5, leftVerticalHidden ? '3,3' : undefined));
  backFrameLines.push(svgLine(backFrameProjected[1].x, backFrameProjected[1].y, backFrameProjected[3].x, backFrameProjected[3].y, 2.5, rightVerticalHidden ? '3,3' : undefined));
  
  // Back frame top edge - 2.5px solid (outer structural edge, back is hidden)
  const topEdgeHidden = isHiddenEdge(backFrameCorners[2], backFrameCorners[3]);
  backFrameLines.push(svgLine(backFrameProjected[2].x, backFrameProjected[2].y, backFrameProjected[3].x, backFrameProjected[3].y, 2.5, topEdgeHidden ? '3,3' : undefined));
  
  // Back frame internal supports (cross-bracing) - 1px dashed (internal support)
  const backFrameCenterBottom = isometricProject(0, seatD, backFrameZ);
  const backFrameCenterTop = isometricProject(0, seatD, backFrameTopZ);
  internalSupportLines.push(svgLine(
    centerX + backFrameCenterBottom.x, centerY + backFrameCenterBottom.y,
    centerX + backFrameCenterTop.x, centerY + backFrameCenterTop.y,
    1, '3,3' // 1px dashed for internal support
  ));
  
  // Render in order: Foundation → Legs → Seat Rails → Back Frame → Internal Supports
  lines.push(...foundationLines);
  lines.push(...legLines);
  lines.push(...seatRailLines);
  lines.push(...backFrameLines);
  lines.push(...internalSupportLines);
  
  // Dimension annotations layer (optional overlay) - using reusable helper
  const dimensionElements: string[] = [];
  if (showDimensions) {
    // Define dimension points in 3D space
    const widthPoints = [
      { x: -seatW, y: -seatD, z: seatFrameZ },  // Front-left
      { x: seatW, y: -seatD, z: seatFrameZ }    // Front-right
    ];
    const depthPoints = [
      { x: seatW, y: -seatD, z: seatFrameZ },   // Right-front
      { x: seatW, y: seatD, z: seatFrameZ }     // Right-back
    ];
    const heightPoints = [
      { x: seatW, y: -seatD, z: 0 },            // Floor (front-right)
      { x: seatW, y: seatD, z: backFrameTopZ }  // Top of back frame
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
  
  // Combine all elements
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
  
  // Dimension annotations layer (optional overlay) - using reusable helper
  const dimensionElements: string[] = [];
  if (showDimensions) {
    // Define dimension points in 3D space (using tabletop level for width/depth)
    // For round tables, use diameter points
    const widthPoints = [
      { x: -radius, y: 0, z: height },  // Left-center-top
      { x: radius, y: 0, z: height }    // Right-center-top
    ];
    const depthPoints = [
      { x: 0, y: -radius, z: height },  // Front-center-top
      { x: 0, y: radius, z: height }    // Back-center-top
    ];
    const heightPoints = [
      { x: radius, y: 0, z: 0 },        // Floor (right-center)
      { x: radius, y: 0, z: height }    // Top of table
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
        svgResult = generateSofaMultiFrame(width, depth, height);
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