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
// Strict values: cos = 0.866, sin = 0.5
const ISO_COS = 0.866;
const ISO_SIN = 0.5;

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
  // Anchored exactly to rear edge of Seat Support Frame (Back Rail), extends to totalHeight
  const backFrameZ = seatFrameTopZ; // Starts at top of seat rails
  const backFrameTopZ = height; // Extends to total height
  
  // Back frame shares corner coordinates with back rail (rear edge of seat frame)
  // Back rail corners: seatCorners[2] (back-right) and seatCorners[3] (back-left)
  const backFrameCorners = [
    { x: -seatW, y: seatD, z: backFrameZ },        // Back-left-bottom (shared with back rail)
    { x: seatW, y: seatD, z: backFrameZ },         // Back-right-bottom (shared with back rail)
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
  
  // Dimension annotations layer (optional overlay)
  const dimensionElements: string[] = [];
  if (showDimensions) {
    // Add arrowhead markers
    dimensionElements.push(svgArrowheadMarker('dimArrow'));
    
    // Calculate dimension positions
    const offset = 15; // 15px offset from structure
    const gap = 2.5; // 2-3px gap for extension lines
    
    // 1. Total Width (W) - parallel to front seat rail, offset downward by 15px
    // Front seat rail: from seatCorners[0] to seatCorners[1] at z = seatFrameZ
    const frontLeftProj = isometricProject(-seatW, -seatD, seatFrameZ);
    const frontRightProj = isometricProject(seatW, -seatD, seatFrameZ);
    
    // Dimension line offset downward (in screen Y direction)
    const widthDimY1 = centerY + frontLeftProj.y + offset;
    const widthDimY2 = centerY + frontRightProj.y + offset;
    const widthDimX1 = centerX + frontLeftProj.x;
    const widthDimX2 = centerX + frontRightProj.x;
    
    // Extension lines: from structure corners with gap
    const widthExt1X = widthDimX1;
    const widthExt1Y = centerY + frontLeftProj.y + gap;
    const widthExt2X = widthDimX2;
    const widthExt2Y = centerY + frontRightProj.y + gap;
    
    dimensionElements.push(svgDimensionLine(
      widthExt1X, widthExt1Y, widthExt2X, widthExt2Y,
      widthDimX1, widthDimY1, widthDimX2, widthDimY2,
      'dimArrow'
    ));
    
    // Width label (W)
    const widthLabelX = (widthDimX1 + widthDimX2) / 2;
    const widthLabelY = widthDimY1 - 5;
    dimensionElements.push(svgDimensionText(widthLabelX, widthLabelY, 'W'));
    
    // 2. Total Depth (D) - parallel to side seat rail, offset diagonally by 15px
    // Right side rail: from seatCorners[1] to seatCorners[2] at z = seatFrameZ
    const rightFrontProj = isometricProject(seatW, -seatD, seatFrameZ);
    const rightBackProj = isometricProject(seatW, seatD, seatFrameZ);
    
    // Offset diagonally (in isometric space: move in +x and +y direction)
    const depthOffsetX = offset * ISO_COS;
    const depthOffsetY = offset * ISO_SIN;
    
    const depthDimX1 = centerX + rightFrontProj.x + depthOffsetX;
    const depthDimY1 = centerY + rightFrontProj.y + depthOffsetY;
    const depthDimX2 = centerX + rightBackProj.x + depthOffsetX;
    const depthDimY2 = centerY + rightBackProj.y + depthOffsetY;
    
    // Extension lines: from structure corners with gap
    const depthGapX = gap * ISO_COS;
    const depthGapY = gap * ISO_SIN;
    const depthExt1X = centerX + rightFrontProj.x + depthGapX;
    const depthExt1Y = centerY + rightFrontProj.y + depthGapY;
    const depthExt2X = centerX + rightBackProj.x + depthGapX;
    const depthExt2Y = centerY + rightBackProj.y + depthGapY;
    
    dimensionElements.push(svgDimensionLine(
      depthExt1X, depthExt1Y, depthExt2X, depthExt2Y,
      depthDimX1, depthDimY1, depthDimX2, depthDimY2,
      'dimArrow'
    ));
    
    // Depth label (D)
    const depthLabelX = (depthDimX1 + depthDimX2) / 2;
    const depthLabelY = (depthDimY1 + depthDimY2) / 2 - 5;
    dimensionElements.push(svgDimensionText(depthLabelX, depthLabelY, 'D'));
    
    // 3. Total Height (H) - perfectly vertical from floor (z=0) to top of back frame
    // Use front-right corner for visibility
    const floorPoint = isometricProject(seatW, -seatD, 0);
    const backTopPoint = isometricProject(seatW, seatD, backFrameTopZ);
    
    // Dimension line offset to the right (in screen X direction)
    const heightDimX = centerX + floorPoint.x + offset;
    const heightDimY1 = centerY + floorPoint.y;
    const heightDimY2 = centerY + backTopPoint.y;
    
    // Extension lines: from structure with gap
    const heightExt1X = centerX + floorPoint.x + gap;
    const heightExt1Y = heightDimY1;
    const heightExt2X = centerX + backTopPoint.x + gap;
    const heightExt2Y = heightDimY2;
    
    dimensionElements.push(svgDimensionLine(
      heightExt1X, heightExt1Y, heightExt2X, heightExt2Y,
      heightDimX, heightDimY1, heightDimX, heightDimY2,
      'dimArrow'
    ));
    
    // Height label (H)
    const heightLabelX = heightDimX + 8;
    const heightLabelY = (heightDimY1 + heightDimY2) / 2;
    dimensionElements.push(svgDimensionText(heightLabelX, heightLabelY, 'H'));
  }
  
  // Combine all elements
  const allElements = [...lines, ...dimensionElements];
  
  return `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background: white;">
    ${allElements.join('\n    ')}
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
    case 'chair': return generateChairFrame(width, depth, height, category, itemName);
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