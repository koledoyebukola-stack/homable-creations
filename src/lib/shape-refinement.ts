/**
 * Shape Refinement for Table Categories (Inspiration Flow Only)
 * 
 * Provides deterministic shape inference for tables without API calls or latency impact.
 * Uses heuristic analysis of item_name, description, and tags to detect organic/freeform shapes.
 */

import { DetectedItem } from './types';

// Feature flag for shape refinement
export const ENABLE_SHAPE_REFINEMENT = true;

// Table categories that benefit from shape refinement
const TABLE_CATEGORIES = [
  'coffee table',
  'side table',
  'dining table',
  'console table',
  'end table'
];

// Expanded shape taxonomy with normalization rules
const SHAPE_KEYWORDS = {
  organic: [
    'organic', 'freeform', 'free form', 'cloud', 'kidney', 
    'pebble', 'amoeba', 'irregular', 'wavy', 'scalloped',
    'blob', 'asymmetric', 'abstract'
  ],
  oval: ['oval', 'racetrack', 'ellipse', 'elliptical'],
  rectangular: ['rectangular', 'rectangle', 'oblong'],
  square: ['square'],
  round: ['round', 'circle', 'circular']
};

// Priority order for shape selection when multiple shapes detected
const SHAPE_PRIORITY = ['organic', 'oval', 'rectangular', 'square', 'round'];

/**
 * Check if item is a table category
 */
export function isTableCategory(category: string): boolean {
  const categoryLower = category?.toLowerCase() || '';
  return TABLE_CATEGORIES.some(table => categoryLower.includes(table));
}

/**
 * Infer table shape from item fields using deterministic heuristics
 * 
 * @param item - DetectedItem with name, description, tags
 * @returns Normalized shape string or null if no shape detected
 */
export function inferTableShape(item: DetectedItem): string | null {
  if (!ENABLE_SHAPE_REFINEMENT) {
    return null;
  }

  // Only process table categories
  if (!isTableCategory(item.category || '')) {
    return null;
  }

  // Combine all text sources
  const allText = [
    item.item_name,
    item.description || '',
    ...(item.tags || [])
  ].join(' ').toLowerCase();

  // Detect all matching shapes
  const detectedShapes = new Set<string>();

  for (const [normalizedShape, keywords] of Object.entries(SHAPE_KEYWORDS)) {
    for (const keyword of keywords) {
      // Use word boundary regex for exact matches
      const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (regex.test(allText)) {
        detectedShapes.add(normalizedShape);
        break; // Found this shape, move to next
      }
    }
  }

  // No shape detected
  if (detectedShapes.size === 0) {
    return null;
  }

  // Single shape detected
  if (detectedShapes.size === 1) {
    return Array.from(detectedShapes)[0];
  }

  // Multiple shapes detected - use priority order
  for (const priorityShape of SHAPE_PRIORITY) {
    if (detectedShapes.has(priorityShape)) {
      return priorityShape;
    }
  }

  return null;
}

/**
 * Check if shape refinement is needed for this item
 * 
 * Refinement is needed when:
 * 1. Item is a table category
 * 2. No shape in tags OR current shape is "round" (might be organic/freeform)
 * 
 * @param item - DetectedItem to check
 * @returns true if refinement should be attempted
 */
export function needsShapeRefinement(item: DetectedItem): boolean {
  if (!ENABLE_SHAPE_REFINEMENT) {
    return false;
  }

  if (!isTableCategory(item.category || '')) {
    return false;
  }

  const tags = item.tags || [];
  const tagsLower = tags.map(t => t.toLowerCase());

  // Check if any existing shape tag exists
  const hasShapeTag = ['round', 'rectangular', 'square', 'oval', 'organic'].some(
    shape => tagsLower.includes(shape)
  );

  // Needs refinement if:
  // - No shape tag exists, OR
  // - Current shape is "round" (might actually be organic/freeform)
  return !hasShapeTag || tagsLower.includes('round');
}

/**
 * Refine shape for a single detected item (synchronous, no API calls)
 * 
 * @param item - DetectedItem to refine
 * @returns Updated item with refined shape in tags, or original item if no refinement
 */
export function refineItemShape(item: DetectedItem): DetectedItem {
  if (!needsShapeRefinement(item)) {
    return item;
  }

  const inferredShape = inferTableShape(item);
  
  if (!inferredShape) {
    return item;
  }

  // Create updated item with refined shape
  const updatedTags = [...(item.tags || [])];
  
  // Remove old shape tags if present
  const oldShapes = ['round', 'rectangular', 'square', 'oval'];
  const filteredTags = updatedTags.filter(
    tag => !oldShapes.includes(tag.toLowerCase())
  );

  // Add new shape tag
  filteredTags.push(inferredShape);

  return {
    ...item,
    tags: filteredTags
  };
}

/**
 * Batch refine shapes for multiple items (synchronous, no API calls)
 * 
 * @param items - Array of DetectedItems
 * @returns Array of items with refined shapes where applicable
 */
export function refineItemShapes(items: DetectedItem[]): DetectedItem[] {
  return items.map(item => refineItemShape(item));
}

/**
 * Get shape for query building (with refinement if applicable)
 * 
 * For tables: Always try inference first to detect organic shapes.
 * If organic detected, use it. Otherwise fall back to tags.
 * 
 * @param item - DetectedItem
 * @returns Shape string to use in query, or null
 */
export function getShapeForQuery(item: DetectedItem): string | null {
  // For tables, always try inference first to catch organic shapes
  if (isTableCategory(item.category || '')) {
    const inferredShape = inferTableShape(item);
    
    // If we inferred organic, always use it (it has highest priority)
    if (inferredShape === 'organic') {
      return 'organic';
    }
    
    // Otherwise, check tags for existing shape
    const tags = item.tags || [];
    const tagsLower = tags.map(t => t.toLowerCase());
    
    const shapeInTags = ['organic', 'oval', 'rectangular', 'square', 'round'].find(
      shape => tagsLower.includes(shape)
    );
    
    // If we have a shape in tags, use it
    if (shapeInTags) {
      return shapeInTags;
    }
    
    // Otherwise use inferred shape (could be oval, rectangular, square, round, or null)
    return inferredShape;
  }
  
  // For non-tables, just check tags
  const tags = item.tags || [];
  const tagsLower = tags.map(t => t.toLowerCase());
  
  const shapeInTags = ['organic', 'oval', 'rectangular', 'square', 'round'].find(
    shape => tagsLower.includes(shape)
  );
  
  return shapeInTags || null;
}