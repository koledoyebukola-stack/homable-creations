# Gifting Unclaim and Edit Fixes

## Root Cause Analysis

### Issue 1: RLS Policies Blocking Updates
**Problem:** The RLS policy "Public can claim items in gifting-enabled checklists" only allowed:
- `USING`: `status = 'pending'` (can only update pending items)
- `WITH CHECK`: `status = 'claimed'` (can only set to claimed)

This meant:
- **Unclaim failed**: Tried to update from 'claimed' → 'pending', violating the USING clause
- **Edit failed**: Tried to update a 'claimed' item, violating the USING clause

### Issue 2: Missing Ownership Verification
**Problem:** When users claimed items before signing in, there was no `claimed_by_user_id`, making it impossible to verify ownership for edit/unclaim operations.

### Issue 3: State Not Updating After Mutations
**Problem:** After successful unclaim/edit, the UI state wasn't properly refreshed, and modal state wasn't cleared.

---

## Fixes Applied

### 1. Added RLS Policies for Authenticated Users

**New Policy: "Authenticated users can edit own claims"**
- Allows authenticated users to UPDATE claimed items they own
- Verifies ownership by `claimed_by_user_id = auth.uid()` OR `claimed_by_user_id IS NULL` (for claims made before sign-in)
- Ensures status remains 'claimed' (not unclaiming)

**New Policy: "Authenticated users can unclaim own items"**
- Allows authenticated users to UPDATE claimed items back to pending
- Verifies ownership same as edit policy
- WITH CHECK ensures:
  - Status reverts to 'pending'
  - All claim fields are cleared (name, date, user_id, timestamp, note)

**Files Modified:**
- `database/checklists_gifting_migration.sql`

### 2. Enhanced Unclaim Logic

**Changes:**
- Added `claimedByName` parameter to `unclaimItem()` for name-based verification
- Verifies ownership by user_id OR name match
- Ensures all claim fields are cleared: `claimed_by_name`, `claimed_at`, `claimed_by_user_id`, `expected_date`, `gift_note`
- Sets status back to 'pending'

**Files Modified:**
- `src/lib/api.ts` - Updated `unclaimItem()` function
- `src/pages/ChecklistGiftingView.tsx` - Pass `claimedByName` to `unclaimItem()`

### 3. Enhanced Edit Logic

**Changes:**
- `updateClaim()` already had name-based verification, but now properly links claims to user accounts
- Automatically sets `claimed_by_user_id` if not already set (when user signs in)
- Verifies ownership by user_id OR name match

**Files Modified:**
- `src/lib/api.ts` - `updateClaim()` already had correct logic, verified it works

### 4. Fixed State Updates

**Changes:**
- After successful unclaim/edit, clear editing state (`editingItemId`, `currentEditingItem`)
- Close modal (`setShowEditModal(false)`)
- Reload checklist data (`loadChecklist()`) to show updated state
- Removed duplicate `onClose()` calls from EditClaimModal (parent handles closing)

**Files Modified:**
- `src/pages/ChecklistGiftingView.tsx` - Enhanced `handleUpdateClaim()` and `handleUnclaim()`
- `src/components/EditClaimModal.tsx` - Removed duplicate `onClose()` calls

---

## Database Migration Required

**Important:** Run the updated migration SQL to add the new RLS policies:

```sql
-- Policy for authenticated users to edit their own claims
CREATE POLICY "Authenticated users can edit own claims" ON app_8574c59127_checklist_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_8574c59127_checklists
      WHERE id = checklist_id 
      AND gifting_enabled = true 
      AND gifting_token IS NOT NULL
    )
    AND status = 'claimed'
    AND (
      claimed_by_user_id = auth.uid()
      OR claimed_by_user_id IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_8574c59127_checklists
      WHERE id = checklist_id 
      AND gifting_enabled = true 
      AND gifting_token IS NOT NULL
    )
    AND status = 'claimed'
  );

-- Policy for authenticated users to unclaim their own items
CREATE POLICY "Authenticated users can unclaim own items" ON app_8574c59127_checklist_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_8574c59127_checklists
      WHERE id = checklist_id 
      AND gifting_enabled = true 
      AND gifting_token IS NOT NULL
    )
    AND status = 'claimed'
    AND (
      claimed_by_user_id = auth.uid()
      OR claimed_by_user_id IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_8574c59127_checklists
      WHERE id = checklist_id 
      AND gifting_enabled = true 
      AND gifting_token IS NOT NULL
    )
    AND status = 'pending'
    AND claimed_by_name IS NULL
    AND claimed_at IS NULL
    AND claimed_by_user_id IS NULL
    AND expected_date IS NULL
    AND gift_note IS NULL
  );
```

---

## Testing Checklist

- [ ] **Unclaim Flow:**
  - [ ] User can unclaim their own item (signed in)
  - [ ] Item status reverts to 'pending' in database
  - [ ] All claim fields are cleared in database
  - [ ] Item appears in "Available Items" section after reload
  - [ ] Item is claimable again by others

- [ ] **Edit Flow:**
  - [ ] User can edit expected date
  - [ ] User can edit gift note
  - [ ] Changes persist in database
  - [ ] Updated values display correctly after reload
  - [ ] Claim is linked to user account if not already linked

- [ ] **State Updates:**
  - [ ] UI refreshes after unclaim (item moves to Available section)
  - [ ] UI refreshes after edit (updated values show)
  - [ ] Modal closes after successful operations
  - [ ] Modal stays open on error (user can retry)

- [ ] **Ownership Verification:**
  - [ ] User cannot edit/unclaim items they didn't claim
  - [ ] Name-based verification works for claims made before sign-in
  - [ ] User_id-based verification works for linked claims

---

## Files Modified

1. `database/checklists_gifting_migration.sql` - Added RLS policies for edit/unclaim
2. `src/lib/api.ts` - Enhanced `unclaimItem()` with name verification
3. `src/pages/ChecklistGiftingView.tsx` - Fixed state updates after mutations
4. `src/components/EditClaimModal.tsx` - Removed duplicate close calls

---

## Next Steps

1. **Run the database migration** to add the new RLS policies
2. **Test unclaim flow** end-to-end
3. **Test edit flow** end-to-end
4. **Verify state updates** in the UI after mutations
