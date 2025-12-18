/**
 * Query builder for Specs flow - shared between SpecsResults and TemplateResults
 * Follows the exact same construction logic: Color → Material/Fabric → Category+Variant → Seating → Dimensions
 */

export interface SpecsFormData {
  category: string;
  width?: number | string;
  length?: number | string;
  depth?: number | string;
  height?: number | string;
  seating?: number | string;
  size?: string;
  shape?: string;
  orientation?: string;
  fabric?: string;
  material?: string;
  color?: string;
  style?: string;
  easy_returns?: boolean;
  lowest_price?: boolean;
}

/**
 * Build retailer search query for Specs flow
 * Uses the same priority order as SpecsResults.tsx: Color → Material/Fabric → Category+Variant → Seating → Dimensions
 */
export function buildSpecsQuery(data: SpecsFormData): string {
  const queryParts: string[] = [];
  const category = data.category;
  
  // Build query following priority order: Color → Material/Fabric → Category+Variant → Seating → Dimensions
  
  // 1. Color (if provided)
  if (data.color) {
    queryParts.push(data.color as string);
  }
  
  // 2. Material/Fabric (if provided)
  if (data.fabric) {
    queryParts.push(data.fabric as string);
  } else if (data.material) {
    queryParts.push(data.material as string);
  }
  
  // 3. Category + key variant
  if (category === 'sofa') {
    // Add shape/orientation as variant - avoid "sectional sofa sofa" repetition
    if (data.shape && data.shape !== 'sofa') {
      queryParts.push(`${data.shape} sectional sofa`);
    } else {
      queryParts.push('sectional sofa');
    }
    
    // 4. Seating capacity
    if (data.seating) {
      queryParts.push(`${data.seating} seater`);
    }
    
    // 5. Dimension constraints
    if (data.width) {
      queryParts.push(`under ${data.width} inches`);
    }
  } else if (category === 'dining-table') {
    // Add shape as variant - avoid "dining table table" repetition
    if (data.shape) {
      queryParts.push(`${data.shape} dining table`);
    } else {
      queryParts.push('dining table');
    }
    
    // 4. Seating capacity
    if (data.seating) {
      queryParts.push(`${data.seating} seater`);
    }
    
    // 5. Dimension constraints
    if (data.length) {
      queryParts.push(`under ${data.length} inches`);
    }
  } else if (category === 'rug') {
    // Add shape as variant - avoid "area rug rug" repetition
    if (data.shape && data.shape !== 'rug') {
      queryParts.push(`${data.shape} area rug`);
    } else {
      queryParts.push('area rug');
    }
    
    // 5. Dimension constraints (rugs use feet)
    if (data.width && data.length) {
      queryParts.push(`under ${data.width}x${data.length} feet`);
    }
  } else if (category === 'bed') {
    // Size is part of category variant
    if (data.size) {
      queryParts.push(`${data.size} bed frame`);
    } else {
      queryParts.push('bed frame');
    }
    
    // Add style if provided
    if (data.style) {
      queryParts.push(data.style as string);
    }
    
    // 5. Dimension constraints
    if (data.height) {
      queryParts.push(`under ${data.height} inches high`);
    }
  } else if (category === 'desk') {
    // Add style as variant - avoid "desk desk" repetition
    if (data.style && data.style !== 'desk') {
      queryParts.push(`${data.style} desk`);
    } else {
      queryParts.push('desk');
    }
    
    // 5. Dimension constraints (width and depth)
    if (data.width) {
      queryParts.push(`under ${data.width} inches wide`);
    }
    if (data.depth) {
      queryParts.push(`under ${data.depth} inches deep`);
    }
  }
  
  // Add priority-based modifiers
  let baseQuery = queryParts.join(' ');
  if (data.easy_returns) {
    baseQuery += ' easy returns';
  }
  if (data.lowest_price) {
    baseQuery += ' budget';
  }

  return baseQuery;
}