# "Gifts I'm helping with" Section Fix

## Root Cause

The "Gifts I'm helping with" section was not appearing because:

1. **`getChecklistsWithMyClaims()` only queried by `claimed_by_user_id`**: The function only looked for items where `claimed_by_user_id = user.id`, which meant claims made before sign-in (where `claimed_by_user_id` is null) were not found.

2. **Claims not automatically linked on sign-in**: When a user claimed an item before signing in, the claim remained unlinked. The claim would only be linked if the user edited it after signing in.

3. **No mechanism to track unlinked claims**: There was no way to identify which unlinked claims belonged to a user who signed in later.

## Solution Implemented

### 1. Store Claim Info in localStorage
When a user claims an item **before signing in**, we now store:
- `itemId`: The claimed item ID
- `checklistId`: The checklist ID
- `giftingToken`: The gifting token (to fetch checklist later)
- `claimedByName`: The name used when claiming
- `timestamp`: When the claim was made

**File Modified:** `src/pages/ChecklistGiftingView.tsx`

### 2. Auto-Link Claims on Sign-In
Created `linkUnlinkedClaims()` function that:
- Checks localStorage for unlinked claims
- Verifies each claim still exists and matches the stored name
- Links valid claims to the user's account
- Removes linked claims from localStorage

**File Modified:** `src/lib/api.ts`

### 3. Enhanced `getChecklistsWithMyClaims()`
Updated the function to:
- First call `linkUnlinkedClaims()` to link any pending claims
- Query for linked claims (by `claimed_by_user_id`)
- Also check localStorage for unlinked claims
- Fetch linked checklists via normal query
- Fetch unlinked checklists via `getChecklistByGiftingToken()` (public access)
- Combine both sets of checklists

**File Modified:** `src/lib/api.ts`

### 4. Auto-Refresh on Sign-In
Added auth state listener to Checklists page to automatically refresh when user signs in.

**File Modified:** `src/pages/Checklists.tsx`

## Flow Diagram

### Before Sign-In:
1. User claims item → `claimed_by_user_id = null`
2. Claim info stored in localStorage
3. Claim visible in gifting view

### After Sign-In:
1. User signs in → Auth state changes
2. `getChecklistsWithMyClaims()` called
3. `linkUnlinkedClaims()` runs → Links claims from localStorage
4. Query finds linked claims → Returns checklists
5. "Gifts I'm helping with" section appears

## Testing Checklist

- [ ] User claims item before signing in
- [ ] Claim info stored in localStorage
- [ ] User signs in
- [ ] Claims are automatically linked
- [ ] "Gifts I'm helping with" section appears
- [ ] Section shows correct checklists
- [ ] User can click to view gifting page
- [ ] User can edit their claimed items
- [ ] User can unclaim items

## Files Modified

1. `src/lib/api.ts`
   - Added `linkUnlinkedClaims()` function
   - Enhanced `getChecklistsWithMyClaims()` to handle unlinked claims

2. `src/pages/ChecklistGiftingView.tsx`
   - Store claim info in localStorage when claiming without sign-in
   - Include gifting token in stored claim info

3. `src/pages/Checklists.tsx`
   - Added auth state listener to refresh on sign-in
   - Added supabase import

## Edge Cases Handled

1. **Multiple unlinked claims**: All claims in localStorage are processed
2. **Stale claims**: Claims that no longer exist or don't match are skipped
3. **Already linked claims**: Claims already linked are not re-processed
4. **Missing tokens**: Claims without gifting tokens are skipped (shouldn't happen)
5. **RLS policies**: Unlinked checklists fetched via public gifting token access

## Future Improvements

- Consider adding a "Claim History" feature to show all claims (linked and unlinked)
- Add expiration for localStorage claims (e.g., 30 days)
- Add UI indicator for unlinked claims that need sign-in to track
