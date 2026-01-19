/**
 * Blueprint Generator - Code-generated SVG technical diagrams
 * Replaces AI-generated images with deterministic, accurate wireframe blueprints
 */

import { CarpenterSpec } from './types';

// Isometric projection constants (30° angle)
const ISO_ANGLE = Math.PI / 6; // 30 degrees in radians
const ISO_COS = Math.cos(ISO_ANGLE);
const ISO_SIN = Math.sin(ISO_ANGLE);

/**
 * Convert 3D coordinates to 2D isometric projection
 */
function isometricProject(x: number, y: number, z: number): { x: number; y: number } {
  // Isometric projection: x' = (x - y) * cos(30°), y' = (x + y) * sin(30°) - z
  return {
    x: (x - y) * ISO_COS,
    y: (x + y) * ISO_SIN - z
  };
}

/**
 * Draw a line in SVG
 */
function svgLine(x1: number, y1: number, x2: number, y2: number): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" stroke-width="2" fill="none"/>`;
}

/**
 * Draw a rectangle frame in isometric view
 */
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

  // Define 8 corners of the box
  const corners = [
    { x: -w, y: -d, z: 0 },   // Front-bottom-left
    { x: w, y: -d, z: 0 },     // Front-bottom-right
    { x: w, y: d, z: 0 },      // Back-bottom-right
    { x: -w, y: d, z: 0 },     // Back-bottom-left
    { x: -w, y: -d, z: h },    // Front-top-left
    { x: w, y: -d, z: h },     // Front-top-right
    { x: w, y: d, z: h },      // Back-top-right
    { x: -w, y: d, z: h },     // Back-top-left
  ];

  // Project corners to 2D
  const projected = corners.map(corner => {
    const proj = isometricProject(corner.x, corner.y, corner.z);
    return { x: centerX + proj.x, y: centerY + proj.y };
  });

  // Draw bottom face (4 edges)
  lines.push(svgLine(projected[0].x, projected[0].y, projected[1].x, projected[1].y)); // Front
  lines.push(svgLine(projected[1].x, projected[1].y, projected[2].x, projected[2].y)); // Right
  lines.push(svgLine(projected[2].x, projected[2].y, projected[3].x, projected[3].y)); // Back
  lines.push(svgLine(projected[3].x, projected[3].y, projected[0].x, projected[0].y)); // Left

  // Draw top face (4 edges)
  lines.push(svgLine(projected[4].x, projected[4].y, projected[5].x, projected[5].y)); // Front
  lines.push(svgLine(projected[5].x, projected[5].y, projected[6].x, projected[6].y)); // Right
  lines.push(svgLine(projected[6].x, projected[6].y, projected[7].x, projected[7].y)); // Back
  lines.push(svgLine(projected[7].x, projected[7].y, projected[4].x, projected[4].y)); // Left

  // Draw vertical edges (4 edges)
  lines.push(svgLine(projected[0].x, projected[0].y, projected[4].x, projected[4].y)); // Front-left
  lines.push(svgLine(projected[1].x, projected[1].y, projected[5].x, projected[5].y)); // Front-right
  lines.push(svgLine(projected[2].x, projected[2].y, projected[6].x, projected[6].y)); // Back-right
  lines.push(svgLine(projected[3].x, projected[3].y, projected[7].x, projected[7].y)); // Back-left

  return lines;
}

/**
 * Template 1: Box Frame
 * For: sofas, cabinets, beds, storage units
 */
function generateBoxFrame(width: number, depth: number, height: number): string {
  const svgWidth = 400;
  const svgHeight = 400;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2 + 50; // Offset down slightly

  const lines = drawIsometricBox(width, depth, height, centerX, centerY);

  // Add internal structural supports (optional cross-bracing)
  const w = width / 2;
  const d = depth / 2;
  const h = height;

  // Front-back center support
  const frontCenter = isometricProject(0, -d, h / 2);
  const backCenter = isometricProject(0, d, h / 2);
  lines.push(svgLine(
    centerX + frontCenter.x,
    centerY + frontCenter.y,
    centerX + backCenter.x,
    centerY + backCenter.y
  ));

  // Left-right center support
  const leftCenter = isometricProject(-w, 0, h / 2);
  const rightCenter = isometricProject(w, 0, h / 2);
  lines.push(svgLine(
    centerX + leftCenter.x,
    centerY + leftCenter.y,
    centerX + rightCenter.x,
    centerY + rightCenter.y
  ));

  return `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background: white;">
    ${lines.join('\n    ')}
  </svg>`;
}

/**
 * Template 2: Chair Frame
 * For: armchairs, lounge chairs, accent chairs
 */
function generateChairFrame(width: number, depth: number, height: number): string {
  const svgWidth = 400;
  const svgHeight = 400;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2 + 50;

  const lines: string[] = [];
  const w = width / 2;
  const d = depth / 2;
  const seatHeight = height * 0.4; // Seat at 40% of total height
  const backHeight = height * 0.6; // Back extends above seat

  // Seat frame (box)
  const seatLines = drawIsometricBox(width, depth, seatHeight * 0.2, centerX, centerY);
  lines.push(...seatLines);

  // Back rest (vertical frame)
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

  // Legs (4 corner legs)
  const legHeight = seatHeight * 0.2;
  const legs = [
    { x: -w, y: -d, z: 0 }, // Front-left
    { x: w, y: -d, z: 0 },  // Front-right
    { x: w, y: d, z: 0 },   // Back-right
    { x: -w, y: d, z: 0 },  // Back-left
  ];

  legs.forEach(leg => {
    const legBottom = isometricProject(leg.x, leg.y, 0);
    const legTop = isometricProject(leg.x, leg.y, legHeight);
    lines.push(svgLine(
      centerX + legBottom.x,
      centerY + legBottom.y,
      centerX + legTop.x,
      centerY + legTop.y
    ));
  });

  return `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background: white;">
    ${lines.join('\n    ')}
  </svg>`;
}

/**
 * Template 3: Table Frame (Rectangular)
 * For: dining tables, desks, consoles
 */
function generateTableFrameRectangular(width: number, depth: number, height: number): string {
  const svgWidth = 400;
  const svgHeight = 400;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2 + 50;

  const lines: string[] = [];
  const w = width / 2;
  const d = depth / 2;
  const tabletopThickness = height * 0.05; // Thin tabletop
  const legHeight = height - tabletopThickness;

  // Tabletop (thin box)
  const topLines = drawIsometricBox(width, depth, tabletopThickness, centerX, centerY);
  lines.push(...topLines);

  // Legs (4 corner legs)
  const legs = [
    { x: -w * 0.9, y: -d * 0.9, z: tabletopThickness }, // Front-left
    { x: w * 0.9, y: -d * 0.9, z: tabletopThickness },  // Front-right
    { x: w * 0.9, y: d * 0.9, z: tabletopThickness },   // Back-right
    { x: -w * 0.9, y: d * 0.9, z: tabletopThickness },  // Back-left
  ];

  legs.forEach(leg => {
    const legTop = isometricProject(leg.x, leg.y, leg.z);
    const legBottom = isometricProject(leg.x, leg.y, 0);
    lines.push(svgLine(
      centerX + legTop.x,
      centerY + legTop.y,
      centerX + legBottom.x,
      centerY + legBottom.y
    ));
  });

  // Optional: Support rails between legs
  const railHeight = legHeight * 0.3;
  // Front rail
  const frontLeftRail = isometricProject(-w * 0.9, -d * 0.9, railHeight);
  const frontRightRail = isometricProject(w * 0.9, -d * 0.9, railHeight);
  lines.push(svgLine(
    centerX + frontLeftRail.x,
    centerY + frontLeftRail.y,
    centerX + frontRightRail.x,
    centerY + frontRightRail.y
  ));
  // Back rail
  const backLeftRail = isometricProject(-w * 0.9, d * 0.9, railHeight);
  const backRightRail = isometricProject(w * 0.9, d * 0.9, railHeight);
  lines.push(svgLine(
    centerX + backLeftRail.x,
    centerY + backLeftRail.y,
    centerX + backRightRail.x,
    centerY + backRightRail.y
  ));

  return `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background: white;">
    ${lines.join('\n    ')}
  </svg>`;
}

/**
 * Template 4: Table Frame (Round)
 * For: round coffee tables, stools
 */
function generateTableFrameRound(width: number, depth: number, height: number): string {
  const svgWidth = 400;
  const svgHeight = 400;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2 + 50;

  const lines: string[] = [];
  const radius = Math.min(width, depth) / 2;
  const tabletopThickness = height * 0.05;
  const legHeight = height - tabletopThickness;

  // Draw circular tabletop (top and bottom circles in isometric)
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

  // Connect top and bottom circles with vertical lines (every 8th point for clarity)
  for (let i = 0; i <= segments; i += 8) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const topProj = isometricProject(x, y, height);
    const bottomProj = isometricProject(x, y, height - tabletopThickness);
    lines.push(svgLine(
      centerX + topProj.x,
      centerY + topProj.y,
      centerX + bottomProj.x,
      centerY + bottomProj.y
    ));
  }

  // Center leg (single leg for round tables)
  const legTop = isometricProject(0, 0, height - tabletopThickness);
  const legBottom = isometricProject(0, 0, 0);
  lines.push(svgLine(
    centerX + legTop.x,
    centerY + legTop.y,
    centerX + legBottom.x,
    centerY + legBottom.y
  ));

  // Optional: Base support (smaller circle at bottom)
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

/**
 * Template 5: Bench / Low Seat Frame
 * For: benches, ottomans, low seating
 */
function generateBenchFrame(width: number, depth: number, height: number): string {
  const svgWidth = 400;
  const svgHeight = 400;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2 + 50;

  const lines: string[] = [];
  const w = width / 2;
  const d = depth / 2;
  const seatThickness = height * 0.15; // Thicker seat for benches

  // Seat frame (box)
  const seatLines = drawIsometricBox(width, depth, seatThickness, centerX, centerY);
  lines.push(...seatLines);

  // Low legs or base (shorter than chair)
  const legHeight = height * 0.2;
  const legs = [
    { x: -w * 0.85, y: -d * 0.85, z: seatThickness }, // Front-left
    { x: w * 0.85, y: -d * 0.85, z: seatThickness },  // Front-right
    { x: w * 0.85, y: d * 0.85, z: seatThickness },   // Back-right
    { x: -w * 0.85, y: d * 0.85, z: seatThickness },  // Back-left
  ];

  legs.forEach(leg => {
    const legTop = isometricProject(leg.x, leg.y, leg.z);
    const legBottom = isometricProject(leg.x, leg.y, 0);
    lines.push(svgLine(
      centerX + legTop.x,
      centerY + legTop.y,
      centerX + legBottom.x,
      centerY + legBottom.y
    ));
  });

  // Optional: Support rails (lower than table)
  const railHeight = legHeight * 0.5;
  // Front rail
  const frontLeftRail = isometricProject(-w * 0.85, -d * 0.85, railHeight);
  const frontRightRail = isometricProject(w * 0.85, -d * 0.85, railHeight);
  lines.push(svgLine(
    centerX + frontLeftRail.x,
    centerY + frontLeftRail.y,
    centerX + frontRightRail.x,
    centerY + frontRightRail.y
  ));
  // Back rail
  const backLeftRail = isometricProject(-w * 0.85, d * 0.85, railHeight);
  const backRightRail = isometricProject(w * 0.85, d * 0.85, railHeight);
  lines.push(svgLine(
    centerX + backLeftRail.x,
    centerY + backLeftRail.y,
    centerX + backRightRail.x,
    centerY + backRightRail.y
  ));

  return `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background: white;">
    ${lines.join('\n    ')}
  </svg>`;
}

/**
 * Select template based on item category
 */
function selectTemplate(category: string | undefined, itemName: string): 'box' | 'chair' | 'table-rect' | 'table-round' | 'bench' {
  if (!category) {
    // Fallback to item name analysis
    const nameLower = itemName.toLowerCase();
    if (nameLower.includes('chair') || nameLower.includes('armchair') || nameLower.includes('lounge')) {
      return 'chair';
    }
    if (nameLower.includes('table') || nameLower.includes('desk') || nameLower.includes('console')) {
      return nameLower.includes('round') || nameLower.includes('circular') ? 'table-round' : 'table-rect';
    }
    if (nameLower.includes('bench') || nameLower.includes('ottoman') || nameLower.includes('stool')) {
      return 'bench';
    }
    return 'box'; // Default
  }

  const catLower = category.toLowerCase();

  // Chair templates
  if (catLower.includes('chair') || catLower.includes('armchair') || catLower.includes('lounge')) {
    return 'chair';
  }

  // Table templates
  if (catLower.includes('table') || catLower.includes('desk') || catLower.includes('console')) {
    if (catLower.includes('round') || catLower.includes('circular') || catLower.includes('coffee')) {
      return 'table-round';
    }
    return 'table-rect';
  }

  // Bench templates
  if (catLower.includes('bench') || catLower.includes('ottoman') || catLower.includes('stool')) {
    return 'bench';
  }

  // Default to box for sofas, cabinets, beds, storage
  return 'box';
}

/**
 * Generate blueprint SVG from carpenter spec
 */
export function generateBlueprintSVG(spec: CarpenterSpec, category?: string, itemName?: string): string {
  const { width_cm, depth_cm, height_cm } = spec.dimensions;

  // Convert cm to a normalized scale (using mm as base unit, scale down for SVG)
  // Scale factor: 1cm = 2 SVG units (so a 100cm item = 200 SVG units)
  const scale = 2;
  const width = width_cm * scale;
  const depth = depth_cm * scale;
  const height = height_cm * scale;

  const template = selectTemplate(category, itemName || '');

  switch (template) {
    case 'box':
      return generateBoxFrame(width, depth, height);
    case 'chair':
      return generateChairFrame(width, depth, height);
    case 'table-rect':
      return generateTableFrameRectangular(width, depth, height);
    case 'table-round':
      return generateTableFrameRound(width, depth, height);
    case 'bench':
      return generateBenchFrame(width, depth, height);
    default:
      return generateBoxFrame(width, depth, height);
  }
}
