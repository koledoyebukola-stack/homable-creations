/**
 * Manual test script for buildRetailerQuery function
 * Run with: node test-retailer-queries.mjs
 */

import { buildRetailerQuery } from './src/lib/retailer-utils.ts';

console.log('=== RETAILER QUERY BUILDER TESTS ===\n');

const tests = [
  {
    name: 'Test 1: Baseline (no descriptors)',
    item: {
      item_name: 'coffee table',
      category: 'coffee table',
      tags: [],
      materials: [],
      dominant_color: '',
      description: ''
    },
    expected: 'coffee table'
  },
  {
    name: 'Test 2: Chandelier with branch/leaf descriptors',
    item: {
      item_name: 'chandelier',
      category: 'chandelier',
      dominant_color: 'gold',
      tags: ['branch', 'leaf', 'modern'],
      materials: ['metal'],
      description: 'A beautiful branch chandelier with leaf details'
    },
    expected: 'gold branch chandelier (should contain gold + branch/leaf)'
  },
  {
    name: 'Test 3: Striped accent chair',
    item: {
      item_name: 'accent chair',
      category: 'chair',
      dominant_color: 'cream',
      tags: ['striped', 'upholstered'],
      materials: ['fabric'],
      description: 'Striped upholstered accent chair'
    },
    expected: 'cream striped accent chair'
  },
  {
    name: 'Test 4: Curved sofa',
    item: {
      item_name: 'sectional sofa',
      category: 'sofa',
      dominant_color: 'white',
      tags: ['curved', 'modern'],
      materials: ['fabric'],
      description: 'Modern curved sectional sofa'
    },
    expected: 'white curved sectional sofa'
  },
  {
    name: 'Test 5: Rectangular coffee table with pattern',
    item: {
      item_name: 'coffee table',
      category: 'coffee table',
      dominant_color: 'brown',
      tags: ['rectangular', 'wood', 'textured'],
      materials: ['wood'],
      description: 'Rectangular wooden coffee table with textured finish'
    },
    expected: 'brown textured rectangular coffee table'
  },
  {
    name: 'Test 6: Deduplication (terms already in item_name)',
    item: {
      item_name: 'striped curved sofa',
      category: 'sofa',
      dominant_color: 'beige',
      tags: ['striped', 'curved', 'modern'],
      materials: ['fabric'],
      description: 'Striped curved modern sofa'
    },
    expected: 'beige striped curved sofa (no duplicates)'
  },
  {
    name: 'Test 7: Rug with runner subtype',
    item: {
      item_name: 'area rug',
      category: 'rug',
      dominant_color: 'neutral',
      tags: ['runner', 'jute', 'woven'],
      materials: ['jute'],
      description: 'Jute runner rug with woven texture'
    },
    expected: 'neutral runner area rug'
  },
  {
    name: 'Test 8: Mirror with arched subtype',
    item: {
      item_name: 'wall mirror',
      category: 'mirror',
      dominant_color: 'gold',
      tags: ['arched', 'full length'],
      materials: ['metal'],
      description: 'Arched full length wall mirror'
    },
    expected: 'gold arched wall mirror'
  }
];

tests.forEach((test, index) => {
  console.log(`${test.name}`);
  console.log('Input:', JSON.stringify(test.item, null, 2));
  
  const query = buildRetailerQuery(test.item);
  console.log('Query:', query);
  console.log('Expected:', test.expected);
  
  // Check for duplicates
  const words = query.split(' ');
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const hasDuplicates = words.length !== uniqueWords.size;
  
  console.log('Word count:', words.length);
  console.log('Unique words:', uniqueWords.size);
  console.log('Has duplicates?', hasDuplicates ? '❌ FAIL' : '✓ PASS');
  
  // Check length constraint
  const exceedsLength = words.length > 10;
  console.log('Exceeds 10 words?', exceedsLength ? '❌ FAIL' : '✓ PASS');
  
  console.log('---\n');
});

console.log('=== SUMMARY ===');
console.log('All tests completed. Check output above for any failures.');
console.log('Key checks:');
console.log('1. No duplicate words in queries');
console.log('2. Queries do not exceed 10 words');
console.log('3. Descriptors (pattern, subtype, feature) are added when present');
console.log('4. Existing behavior (color, shape, material) is preserved');