/**
 * Integration tests for retailer query building with shape refinement
 */

import { describe, it, expect } from 'vitest';
import { buildRetailerQuery } from '../retailer-utils';
import { DetectedItem } from '../types';

describe('buildRetailerQuery with Shape Refinement', () => {
  it('should build query with organic shape for cloud table', () => {
    const item: DetectedItem = {
      item_name: 'coffee table',
      category: 'coffee table',
      dominant_color: 'white',
      tags: ['cloud', 'modern'],
      materials: ['wood'],
      description: 'Cloud shaped coffee table'
    };
    const query = buildRetailerQuery(item);
    expect(query).toContain('organic');
    expect(query).toContain('white');
    expect(query).toContain('coffee table');
  });

  it('should build query with organic shape for kidney table', () => {
    const item: DetectedItem = {
      item_name: 'coffee table',
      category: 'coffee table',
      dominant_color: 'brown',
      tags: ['kidney', 'wood'],
      materials: ['wood'],
      description: 'Kidney shaped coffee table'
    };
    const query = buildRetailerQuery(item);
    expect(query).toContain('organic');
    expect(query).toContain('brown');
  });

  it('should build query with organic shape for freeform table', () => {
    const item: DetectedItem = {
      item_name: 'freeform coffee table',
      category: 'coffee table',
      dominant_color: 'natural',
      tags: ['modern'],
      materials: ['wood'],
      description: ''
    };
    const query = buildRetailerQuery(item);
    expect(query).toContain('organic');
    expect(query).not.toContain('freeform'); // normalized to organic
  });

  it('should build query with oval shape', () => {
    const item: DetectedItem = {
      item_name: 'dining table',
      category: 'dining table',
      dominant_color: 'brown',
      tags: ['oval', 'wood'],
      materials: ['wood'],
      description: 'Oval dining table'
    };
    const query = buildRetailerQuery(item);
    expect(query).toContain('oval');
    expect(query).toContain('brown');
  });

  it('should build query with rectangular shape', () => {
    const item: DetectedItem = {
      item_name: 'coffee table',
      category: 'coffee table',
      dominant_color: 'black',
      tags: ['rectangular', 'metal'],
      materials: ['metal'],
      description: 'Rectangular coffee table'
    };
    const query = buildRetailerQuery(item);
    expect(query).toContain('rectangular');
    expect(query).toContain('black');
  });

  it('should prioritize organic over round when both signals present', () => {
    const item: DetectedItem = {
      item_name: 'coffee table',
      category: 'coffee table',
      dominant_color: 'white',
      tags: ['round', 'cloud'],
      materials: ['wood'],
      description: 'Cloud shaped coffee table'
    };
    const query = buildRetailerQuery(item);
    expect(query).toContain('organic');
    expect(query).not.toContain('round');
  });

  it('should not add shape if already in item_name', () => {
    const item: DetectedItem = {
      item_name: 'organic coffee table',
      category: 'coffee table',
      dominant_color: 'brown',
      tags: ['cloud', 'modern'],
      materials: ['wood'],
      description: ''
    };
    const query = buildRetailerQuery(item);
    const organicCount = (query.match(/organic/gi) || []).length;
    expect(organicCount).toBe(1); // Should appear only once
  });

  it('should handle tables without shape information', () => {
    const item: DetectedItem = {
      item_name: 'coffee table',
      category: 'coffee table',
      dominant_color: 'brown',
      tags: ['modern', 'wood'],
      materials: ['wood'],
      description: 'Modern coffee table'
    };
    const query = buildRetailerQuery(item);
    expect(query).toBe('brown wood coffee table');
  });

  it('should ensure queries stay under 10 words', () => {
    const item: DetectedItem = {
      item_name: 'coffee table',
      category: 'coffee table',
      dominant_color: 'white',
      tags: ['cloud', 'modern', 'textured', 'upholstered'],
      materials: ['wood', 'fabric'],
      description: 'Cloud shaped textured coffee table'
    };
    const query = buildRetailerQuery(item);
    const wordCount = query.split(' ').length;
    expect(wordCount).toBeLessThanOrEqual(10);
  });

  it('should ensure no duplicate words in query', () => {
    const item: DetectedItem = {
      item_name: 'organic coffee table',
      category: 'coffee table',
      dominant_color: 'brown',
      tags: ['organic', 'cloud', 'wood'],
      materials: ['wood'],
      description: 'Organic cloud coffee table'
    };
    const query = buildRetailerQuery(item);
    const words = query.split(' ');
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    expect(words.length).toBe(uniqueWords.size);
  });

  it('should work for console tables', () => {
    const item: DetectedItem = {
      item_name: 'console table',
      category: 'console table',
      dominant_color: 'gold',
      tags: ['kidney', 'metal'],
      materials: ['metal'],
      description: 'Kidney shaped console table'
    };
    const query = buildRetailerQuery(item);
    expect(query).toContain('organic');
    expect(query).toContain('gold');
  });

  it('should work for side tables', () => {
    const item: DetectedItem = {
      item_name: 'side table',
      category: 'side table',
      dominant_color: 'white',
      tags: ['cloud', 'marble'],
      materials: ['marble'],
      description: 'Cloud side table'
    };
    const query = buildRetailerQuery(item);
    expect(query).toContain('organic');
    expect(query).toContain('white');
  });

  it('should handle pebble shape keyword', () => {
    const item: DetectedItem = {
      item_name: 'coffee table',
      category: 'coffee table',
      dominant_color: 'beige',
      tags: ['pebble', 'stone'],
      materials: ['stone'],
      description: 'Pebble shaped coffee table'
    };
    const query = buildRetailerQuery(item);
    expect(query).toContain('organic');
  });

  it('should handle amoeba shape keyword', () => {
    const item: DetectedItem = {
      item_name: 'coffee table',
      category: 'coffee table',
      dominant_color: 'black',
      tags: ['amoeba', 'glass'],
      materials: ['glass'],
      description: 'Amoeba shaped coffee table'
    };
    const query = buildRetailerQuery(item);
    expect(query).toContain('organic');
  });

  it('should handle irregular shape keyword', () => {
    const item: DetectedItem = {
      item_name: 'dining table',
      category: 'dining table',
      dominant_color: 'natural',
      tags: ['irregular', 'wood'],
      materials: ['wood'],
      description: 'Irregular shaped dining table'
    };
    const query = buildRetailerQuery(item);
    expect(query).toContain('organic');
  });
});