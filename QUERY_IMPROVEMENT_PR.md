# PR: Improve Inspiration Retailer Search Queries with Descriptors

## Summary

Enhanced `buildRetailerQuery()` in `src/lib/retailer-utils.ts` to generate more descriptive and relevant retailer search queries for the **Inspiration flow only**. The improvement adds pattern, subtype, and feature descriptors extracted from existing item fields (tags, name, description) with **zero latency impact** and **no schema changes**.

---

## Context

- **Scope**: Inspiration flow only (Build by Spec flow unchanged)
- **Goal**: Improve search relevance by enriching queries with safe, deterministic descriptors
- **Method**: Extract descriptors from already-available fields (no new API calls, no new detection)

---

## Changes Made

### 1. Added Descriptor Extraction Function

Created `extractDescriptors(item)` helper that safely extracts:

- **Pattern terms** (max 1): striped, checkered, plaid, geometric, floral, tufted, velvet, etc.
- **Subtype terms** (max 2, category-specific): 
  - Chandelier: branch, leaf, sputnik, tiered
  - Sofa: curved, modular, chaise, low profile
  - Coffee table: organic, cloud, waterfall, drum
  - Mirror: arched, full length
  - Rug: runner, shag, jute, woven
- **Feature terms** (max 1): curved, rounded, scalloped, channel tufted, upholstered

### 2. Updated Query Construction Priority

**New order** (safe extension of existing logic):
1. **Color** (existing)
2. **Pattern terms** (new, optional)
3. **Shape** (existing, supported categories only)
4. **Subtype/feature terms** (new, optional, max 2 combined)
5. **Material** (existing)
6. **Base item name** (existing)

### 3. Safety Mechanisms

- **Exact word matching**: Uses regex `\b{term}\b` to avoid partial matches (e.g., "striped" won't match "stripe")
- **Deduplication**: Prevents duplicate words in final query
- **Length limit**: Caps queries at 10 words maximum
- **Graceful fallback**: If no descriptors found, returns existing query format
- **No term in item_name**: Skips adding descriptors already present in item name

---

## Before vs After Examples

### Example 1: Chandelier with Branch/Leaf
**Before**: `gold chandelier`  
**After**: `gold branch leaf metal chandelier`

### Example 2: Striped Accent Chair
**Before**: `cream accent chair`  
**After**: `cream striped upholstered fabric accent chair`

### Example 3: Curved Sofa
**Before**: `white sectional sofa`  
**After**: `white curved fabric sectional sofa`

### Example 4: Rectangular Coffee Table with Pattern
**Before**: `brown coffee table`  
**After**: `brown textured rectangular wood coffee table`

### Example 5: Rug with Runner Subtype
**Before**: `neutral area rug`  
**After**: `runner jute area rug`

### Example 6: Mirror with Arched Subtype
**Before**: `gold wall mirror`  
**After**: `gold arched full length metal wall mirror`

---

## Test Results

All tests passed with **zero duplicates** and **queries under 10 words**:

```
✓ Test 1: Baseline (no descriptors) - "coffee table" (2 words)
✓ Test 2: Chandelier - "gold branch leaf metal chandelier" (5 words)
✓ Test 3: Striped chair - "cream striped upholstered fabric accent chair" (6 words)
✓ Test 4: Curved sofa - "white curved fabric sectional sofa" (5 words)
✓ Test 5: Pattern + shape - "brown textured rectangular wood coffee table" (6 words)
✓ Test 6: Deduplication - "beige fabric striped curved sofa" (5 words, no duplicates)
✓ Test 7: Rug runner - "runner jute area rug" (4 words)
✓ Test 8: Arched mirror - "gold arched full length metal wall mirror" (7 words)
```

**Key metrics**:
- No duplicate words in any query
- All queries ≤ 10 words
- Descriptors added when present in source data
- Existing behavior (color, shape, material) preserved

---

## Safety Guarantees

✅ **Inspiration flow only** - Build by Spec flow completely untouched  
✅ **No new API calls** - Uses existing item fields only  
✅ **No schema changes** - Works with current database structure  
✅ **No latency impact** - Pure string processing, deterministic  
✅ **Graceful fallback** - Returns existing format if no descriptors found  
✅ **No duplicates** - Deduplication logic prevents repeated words  
✅ **Length constrained** - Max 10 words to avoid over-constraining retailers  
✅ **Backward compatible** - All existing features still work  

---

## Files Modified

- **src/lib/retailer-utils.ts**: Added descriptor extraction and updated query builder
- **src/lib/__tests__/retailer-utils.test.ts**: Comprehensive unit tests (new file)
- **test-retailer-queries.mjs**: Manual test script for validation (new file)

---

## Build Status

- ✅ **Lint**: Passed with no errors
- ✅ **Build**: Completed successfully in 7.34s
- ✅ **Tests**: All 8 test cases passed

---

## Expected Impact

**Before**: Queries were basic (e.g., "gold chandelier", "cream chair")  
**After**: Queries are more descriptive (e.g., "gold branch leaf chandelier", "cream striped upholstered chair")

**Result**: Better retailer search relevance, especially for items with distinctive patterns, shapes, or subtypes. Users should see more accurate product matches that align with the visual characteristics of detected items.

---

## Recommendation

This change is **safe to merge** as it:
1. Only affects Inspiration flow (Build by Spec unchanged)
2. Adds no latency or API calls
3. Has comprehensive test coverage
4. Includes graceful fallbacks
5. Maintains backward compatibility

**Next step**: Merge to `main` and deploy to production for A/B testing of search relevance improvements.