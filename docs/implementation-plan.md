# Homable Implementation Plan

## Status Legend
- [ ] Not Started
- [🔄] In Progress
- [✅] Completed

## A) Start with Specs Flow Improvements

### A1. Back Navigation Behavior [✅]
- [✅] Update Upload.tsx to read `?tab=specs` from URL
- [✅] Update SpecsForm.tsx back button to navigate to `/upload?tab=specs`

### A2. Auth Enforcement Timing [✅]
- [✅] Add auth check in SpecsForm.tsx before navigation to results
- [✅] Show AuthModal if user not authenticated
- [✅] Navigate to results after successful auth

### A3. Specs Results Auto-save to History [🔄]
- [✅] Auto-save function exists in SpecsResults.tsx
- [ ] Verify database table `app_8574c59127_specs_history` exists
- [ ] Test auto-save functionality

### A4. Specs History Card Rendering [ ]
- [ ] Create SpecsHistoryCard component
- [ ] Display category title, search strategies summary
- [ ] Show query text preview (truncated)
- [ ] Link to specs results page with data

### A5. History Access from Results Page [ ]
- [ ] Add History button/icon to SpecsResults.tsx
- [ ] Add History button/icon to ProductMatches.tsx (inspiration results)
- [ ] Create unified History page showing both inspiration and specs

### A6. Edit Specs [✅]
- [✅] Edit button already implemented in SpecsResults.tsx
- [✅] Form pre-fills with existing data

## B) Retailer Button Logic Consistency

### B1. Location-aware Retailer Domains [🔄]
- [✅] Already implemented in SpecsResults.tsx
- [ ] Apply to ProductMatches.tsx (inspiration results)
- [ ] Apply to ChecklistDetail.tsx (shopping list page)

### B2. Retailer Button Hierarchy [ ]
- [ ] Update ProductMatches.tsx with primary/secondary retailer buttons
- [ ] Update ChecklistDetail.tsx with primary/secondary retailer buttons
- [ ] Ensure Google search is secondary (text link below)

### B3. Shopping List Retailer Buttons [ ]
- [ ] Add Wayfair, Walmart, Temu buttons to ChecklistDetail.tsx
- [ ] Use same query and location logic as results pages

## C) Inspiration Flow Enhancements

### C1. Events Row [✅]
- [✅] Generated event images (proposal, first birthday, vow renewal)
- [✅] Added Events category to Upload.tsx

### C2. Improve Item Detection Coverage [ ]
- [ ] Review edge function `app_8574c59127_analyze_image`
- [ ] Enhance detection to catch wall items and other missed elements
- [ ] Test with sample images

### C3. Dimensions for Items [ ]
- [ ] Add dimensions field to detected_items table
- [ ] Update analyze_image edge function to detect/estimate dimensions
- [ ] Add dimension display/input UI in ProductMatches.tsx
- [ ] Focus on: rugs, wall art, tables, couches

### C4. Materials List [ ]
- [ ] Add materials detection to analyze_image edge function
- [ ] Create materials section in ProductMatches.tsx
- [ ] Display wall materials (paint, wallpaper, panels)
- [ ] Display floor materials (wood, laminate, tile, rug)

## D) Saved Shopping List State Improvements

### D1. Past Tense + Button State [ ]
- [ ] Track if board already saved to checklist
- [ ] Update ProductMatches.tsx save button state
- [ ] Update SpecsResults.tsx save button state
- [ ] Show "Saved to Shopping List" with greyed button
- [ ] Add "Open list" link/button

## E) Gifting MVP (No Payments)

### E1. Share for Gifting Entry Point [ ]
- [ ] Add "Share for gifting" CTA to ProductMatches.tsx
- [ ] Add "Share for gifting" CTA to SpecsResults.tsx

### E2. Gift Page Behavior [ ]
- [ ] Create GiftPage.tsx component
- [ ] Generate shareable link with gift ID
- [ ] Display title (editable by owner)
- [ ] Show plan summary (image + items OR specs + strategies)
- [ ] Add retailer buttons with location logic
- [ ] Implement "Claim" mechanism (no account required)
- [ ] Collect gifter name + optional message
- [ ] Mark items as "Claimed"

### E3. Owner View [ ]
- [ ] Show claimed status in History view
- [ ] Show claimed status in ProductMatches.tsx
- [ ] Show claimed status in SpecsResults.tsx

## Implementation Order (as requested)
1. [✅] Auth gating after specs form
2. [🔄] History save + rendering + click-through
3. [ ] Retailer logic consistency across all pages
4. [🔄] Inspiration improvements (events row, detection, dimensions, materials)
5. [ ] Saved state button behavior
6. [ ] Gifting MVP