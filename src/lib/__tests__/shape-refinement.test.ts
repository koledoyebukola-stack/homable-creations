/**
 * Unit tests for shape refinement functionality
 */

import { describe, it, expect } from 'vitest';
import {
  inferTableShape,
  isTableCategory,
  needsShapeRefinement,
  refineItemShape,
  getShapeForQuery
} from '../shape-refinement';
import { DetectedItem } from '../types';

describe('Shape Refinement', () => {
  describe('isTableCategory', () => {
    it('should identify table categories', () => {
      expect(isTableCategory('coffee table')).toBe(true);
      expect(isTableCategory('side table')).toBe(true);
      expect(isTableCategory('dining table')).toBe(true);
      expect(isTableCategory('console table')).toBe(true);
      expect(isTableCategory('end table')).toBe(true);
    });

    it('should reject non-table categories', () => {
      expect(isTableCategory('chair')).toBe(false);
      expect(isTableCategory('sofa')).toBe(false);
      expect(isTableCategory('lamp')).toBe(false);
    });
  });

  describe('inferTableShape', () => {
    it('should detect organic/cloud shapes', () => {
      const item1: DetectedItem = {
        item_name: 'cloud coffee table',
        category: 'coffee table',
        tags: [],
        materials: [],
        dominant_color: '',
        description: ''
      };
      expect(inferTableShape(item1)).toBe('organic');

      const item2: DetectedItem = {
        item_name: 'coffee table',
        category: 'coffee table',
        tags: ['kidney', 'modern'],
        materials: [],
        dominant_color: '',
        description: 'Kidney shaped coffee table'
      };
      expect(inferTableShape(item2)).toBe('organic');

      const item3: DetectedItem = {
        item_name: 'freeform coffee table',
        category: 'coffee table',
        tags: [],
        materials: [],
        dominant_color: '',
        description: ''
      };
      expect(inferTableShape(item3)).toBe('organic');
    });

    it('should detect oval shapes', () => {
      const item: DetectedItem = {
        item_name: 'oval coffee table',
        category: 'coffee table',
        tags: [],
        materials: [],
        dominant_color: '',
        description: ''
      };
      expect(inferTableShape(item)).toBe('oval');
    });

    it('should detect rectangular shapes', () => {
      const item: DetectedItem = {
        item_name: 'rectangle coffee table',
        category: 'coffee table',
        tags: ['rectangular'],
        materials: [],
        dominant_color: '',
        description: ''
      };
      expect(inferTableShape(item)).toBe('rectangular');
    });

    it('should detect square shapes', () => {
      const item: DetectedItem = {
        item_name: 'square coffee table',
        category: 'coffee table',
        tags: [],
        materials: [],
        dominant_color: '',
        description: ''
      };
      expect(inferTableShape(item)).toBe('square');
    });

    it('should detect round shapes', () => {
      const item: DetectedItem = {
        item_name: 'round coffee table',
        category: 'coffee table',
        tags: [],
        materials: [],
        dominant_color: '',
        description: ''
      };
      expect(inferTableShape(item)).toBe('round');
    });

    it('should return null when no shape detected', () => {
      const item: DetectedItem = {
        item_name: 'coffee table',
        category: 'coffee table',
        tags: [],
        materials: [],
        dominant_color: '',
        description: ''
      };
      expect(inferTableShape(item)).toBe(null);
    });

    it('should prioritize organic over round when both present', () => {
      const item: DetectedItem = {
        item_name: 'round organic coffee table',
        category: 'coffee table',
        tags: [],
        materials: [],
        dominant_color: '',
        description: ''
      };
      expect(inferTableShape(item)).toBe('organic');
    });

    it('should prioritize organic over rectangular when both present', () => {
      const item: DetectedItem = {
        item_name: 'coffee table',
        category: 'coffee table',
        tags: ['cloud', 'rectangular'],
        materials: [],
        dominant_color: '',
        description: 'Cloud shaped rectangular base'
      };
      expect(inferTableShape(item)).toBe('organic');
    });

    it('should handle multi-word shape keywords', () => {
      const item: DetectedItem = {
        item_name: 'free form coffee table',
        category: 'coffee table',
        tags: [],
        materials: [],
        dominant_color: '',
        description: ''
      };
      expect(inferTableShape(item)).toBe('organic');
    });

    it('should not detect shapes for non-table items', () => {
      const item: DetectedItem = {
        item_name: 'round chair',
        category: 'chair',
        tags: [],
        materials: [],
        dominant_color: '',
        description: ''
      };
      expect(inferTableShape(item)).toBe(null);
    });
  });

  describe('needsShapeRefinement', () => {
    it('should return true for tables without shape tags', () => {
      const item: DetectedItem = {
        item_name: 'coffee table',
        category: 'coffee table',
        tags: ['modern', 'wood'],
        materials: [],
        dominant_color: '',
        description: ''
      };
      expect(needsShapeRefinement(item)).toBe(true);
    });

    it('should return true for tables with round shape (might be organic)', () => {
      const item: DetectedItem = {
        item_name: 'coffee table',
        category: 'coffee table',
        tags: ['round', 'modern'],
        materials: [],
        dominant_color: '',
        description: ''
      };
      expect(needsShapeRefinement(item)).toBe(true);
    });

    it('should return false for tables with definitive shape tags', () => {
      const item: DetectedItem = {
        item_name: 'coffee table',
        category: 'coffee table',
        tags: ['rectangular', 'modern'],
        materials: [],
        dominant_color: '',
        description: ''
      };
      expect(needsShapeRefinement(item)).toBe(false);
    });

    it('should return false for non-table items', () => {
      const item: DetectedItem = {
        item_name: 'chair',
        category: 'chair',
        tags: [],
        materials: [],
        dominant_color: '',
        description: ''
      };
      expect(needsShapeRefinement(item)).toBe(false);
    });
  });

  describe('refineItemShape', () => {
    it('should add organic shape when detected', () => {
      const item: DetectedItem = {
        item_name: 'cloud coffee table',
        category: 'coffee table',
        tags: ['modern'],
        materials: [],
        dominant_color: '',
        description: ''
      };
      const refined = refineItemShape(item);
      expect(refined.tags).toContain('organic');
    });

    it('should replace round with organic when organic detected', () => {
      const item: DetectedItem = {
        item_name: 'kidney coffee table',
        category: 'coffee table',
        tags: ['round', 'modern'],
        materials: [],
        dominant_color: '',
        description: ''
      };
      const refined = refineItemShape(item);
      expect(refined.tags).toContain('organic');
      expect(refined.tags).not.toContain('round');
    });

    it('should not modify items that do not need refinement', () => {
      const item: DetectedItem = {
        item_name: 'coffee table',
        category: 'coffee table',
        tags: ['rectangular', 'modern'],
        materials: [],
        dominant_color: '',
        description: ''
      };
      const refined = refineItemShape(item);
      expect(refined).toEqual(item);
    });
  });

  describe('getShapeForQuery', () => {
    it('should return shape from tags if present', () => {
      const item: DetectedItem = {
        item_name: 'coffee table',
        category: 'coffee table',
        tags: ['rectangular', 'modern'],
        materials: [],
        dominant_color: '',
        description: ''
      };
      expect(getShapeForQuery(item)).toBe('rectangular');
    });

    it('should infer shape for tables without shape tags', () => {
      const item: DetectedItem = {
        item_name: 'cloud coffee table',
        category: 'coffee table',
        tags: ['modern'],
        materials: [],
        dominant_color: '',
        description: ''
      };
      expect(getShapeForQuery(item)).toBe('organic');
    });

    it('should return null for non-tables without shape tags', () => {
      const item: DetectedItem = {
        item_name: 'chair',
        category: 'chair',
        tags: ['modern'],
        materials: [],
        dominant_color: '',
        description: ''
      };
      expect(getShapeForQuery(item)).toBe(null);
    });
  });
});