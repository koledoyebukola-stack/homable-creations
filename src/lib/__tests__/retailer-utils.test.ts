/**
 * Unit tests for buildRetailerQuery function
 * Tests descriptor extraction, deduplication, and query construction
 */

import { buildRetailerQuery } from '../retailer-utils';
import { DetectedItem } from '../types';

describe('buildRetailerQuery - Inspiration Flow Query Builder', () => {
  
  // Test 1: Baseline - no descriptors (should match existing behavior)
  test('should return base query when no descriptors are found', () => {
    const item: DetectedItem = {
      item_name: 'coffee table',
      category: 'coffee table',
      tags: [],
      materials: [],
      dominant_color: '',
      description: ''
    };
    
    const query = buildRetailerQuery(item);
    expect(query).toBe('coffee table');
    console.log('✓ Test 1 - Baseline (no descriptors):', query);
  });

  // Test 2: Color only (existing behavior)
  test('should add color when not in item_name', () => {
    const item: DetectedItem = {
      item_name: 'coffee table',
      category: 'coffee table',
      dominant_color: 'brown',
      tags: [],
      materials: []
    };
    
    const query = buildRetailerQuery(item);
    expect(query).toBe('brown coffee table');
    console.log('✓ Test 2 - Color only:', query);
  });

  // Test 3: Chandelier with branch/leaf descriptors
  test('should add subtype terms for chandelier (branch/leaf)', () => {
    const item: DetectedItem = {
      item_name: 'chandelier',
      category: 'chandelier',
      dominant_color: 'gold',
      tags: ['branch', 'leaf', 'modern'],
      materials: ['metal'],
      description: 'A beautiful branch chandelier with leaf details'
    };
    
    const query = buildRetailerQuery(item);
    expect(query).toContain('gold');
    expect(query).toContain('branch');
    expect(query).toContain('chandelier');
    expect(query).not.toContain('branch branch'); // No duplicates
    console.log('✓ Test 3 - Chandelier with branch/leaf:', query);
  });

  // Test 4: Striped accent chair
  test('should add pattern term (striped) for chair', () => {
    const item: DetectedItem = {
      item_name: 'accent chair',
      category: 'chair',
      dominant_color: 'cream',
      tags: ['striped', 'upholstered'],
      materials: ['fabric'],
      description: 'Striped upholstered accent chair'
    };
    
    const query = buildRetailerQuery(item);
    expect(query).toContain('cream');
    expect(query).toContain('striped');
    expect(query).toContain('accent chair');
    expect(query).not.toContain('striped striped'); // No duplicates
    console.log('✓ Test 4 - Striped accent chair:', query);
  });

  // Test 5: Curved sofa
  test('should add feature term (curved) for sofa', () => {
    const item: DetectedItem = {
      item_name: 'sectional sofa',
      category: 'sofa',
      dominant_color: 'white',
      tags: ['curved', 'modern'],
      materials: ['fabric'],
      description: 'Modern curved sectional sofa'
    };
    
    const query = buildRetailerQuery(item);
    expect(query).toContain('white');
    expect(query).toContain('curved');
    expect(query).toContain('sectional sofa');
    console.log('✓ Test 5 - Curved sofa:', query);
  });

  // Test 6: Shape + pattern + color (coffee table)
  test('should combine color, pattern, shape, and material correctly', () => {
    const item: DetectedItem = {
      item_name: 'coffee table',
      category: 'coffee table',
      dominant_color: 'brown',
      tags: ['rectangular', 'wood', 'textured'],
      materials: ['wood'],
      description: 'Rectangular wooden coffee table with textured finish'
    };
    
    const query = buildRetailerQuery(item);
    expect(query).toContain('brown');
    expect(query).toContain('textured');
    expect(query).toContain('rectangular');
    expect(query).toContain('coffee table');
    // Material 'wood' already in tags, should not duplicate
    expect(query.split('wood').length - 1).toBeLessThanOrEqual(1);
    console.log('✓ Test 6 - Shape + pattern + color:', query);
  });

  // Test 7: Deduplication test
  test('should not duplicate terms already in item_name', () => {
    const item: DetectedItem = {
      item_name: 'striped curved sofa',
      category: 'sofa',
      dominant_color: 'beige',
      tags: ['striped', 'curved', 'modern'],
      materials: ['fabric'],
      description: 'Striped curved modern sofa'
    };
    
    const query = buildRetailerQuery(item);
    expect(query).toContain('beige');
    expect(query).toContain('striped curved sofa');
    // Should not add 'striped' or 'curved' again since they're in item_name
    expect(query.split('striped').length - 1).toBe(1);
    expect(query.split('curved').length - 1).toBe(1);
    console.log('✓ Test 7 - Deduplication (terms in item_name):', query);
  });

  // Test 8: Rug with runner subtype
  test('should add subtype term (runner) for rug', () => {
    const item: DetectedItem = {
      item_name: 'area rug',
      category: 'rug',
      dominant_color: 'neutral',
      tags: ['runner', 'jute', 'woven'],
      materials: ['jute'],
      description: 'Jute runner rug with woven texture'
    };
    
    const query = buildRetailerQuery(item);
    expect(query).toContain('neutral');
    expect(query).toContain('runner');
    expect(query).toContain('area rug');
    console.log('✓ Test 8 - Rug with runner subtype:', query);
  });

  // Test 9: Max length constraint (should cap at 10 words)
  test('should limit query to max 10 words', () => {
    const item: DetectedItem = {
      item_name: 'dining table',
      category: 'dining table',
      dominant_color: 'brown',
      tags: ['rectangular', 'extendable', 'tufted', 'striped', 'modern', 'rustic'],
      materials: ['wood', 'metal'],
      description: 'Rectangular extendable dining table with many features'
    };
    
    const query = buildRetailerQuery(item);
    const wordCount = query.split(' ').length;
    expect(wordCount).toBeLessThanOrEqual(10);
    console.log('✓ Test 9 - Max length constraint (≤10 words):', query, `(${wordCount} words)`);
  });

  // Test 10: No descriptors available (fallback to existing behavior)
  test('should gracefully handle missing descriptors', () => {
    const item: DetectedItem = {
      item_name: 'side table',
      category: 'side table',
      tags: ['modern'], // No matching descriptors
      materials: [],
      dominant_color: ''
    };
    
    const query = buildRetailerQuery(item);
    expect(query).toBe('side table');
    console.log('✓ Test 10 - No descriptors (graceful fallback):', query);
  });

  // Summary test
  test('SUMMARY: All tests should produce valid, non-duplicate queries', () => {
    const testItems: DetectedItem[] = [
      {
        item_name: 'chandelier',
        category: 'chandelier',
        dominant_color: 'gold',
        tags: ['branch', 'leaf'],
        materials: ['metal']
      },
      {
        item_name: 'accent chair',
        category: 'chair',
        dominant_color: 'cream',
        tags: ['striped', 'upholstered'],
        materials: ['fabric']
      },
      {
        item_name: 'sectional sofa',
        category: 'sofa',
        dominant_color: 'white',
        tags: ['curved'],
        materials: ['fabric']
      }
    ];

    console.log('\n=== QUERY SUMMARY ===');
    testItems.forEach((item, index) => {
      const query = buildRetailerQuery(item);
      const words = query.split(' ');
      const uniqueWords = new Set(words.map(w => w.toLowerCase()));
      
      console.log(`${index + 1}. ${item.item_name}:`);
      console.log(`   Query: "${query}"`);
      console.log(`   Words: ${words.length}, Unique: ${uniqueWords.size}`);
      
      // Verify no duplicates
      expect(words.length).toBe(uniqueWords.size);
    });
    console.log('===================\n');
  });
});