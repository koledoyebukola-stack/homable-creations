# Gifting MVP Implementation Plan

## Overview
Implement a gifting feature that allows users to share their inspiration boards as gifts that can be claimed by recipients.

## Database Schema Required

### Table: `app_8574c59127_board_gifts`
```sql
CREATE TABLE IF NOT EXISTS app_8574c59127_board_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users (id),
  recipient_email TEXT,
  recipient_name TEXT,
  gift_message TEXT,
  share_token TEXT UNIQUE NOT NULL,
  claimed_at TIMESTAMPTZ,
  claimed_by_user_id UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS board_gifts_board_id_idx ON app_8574c59127_board_gifts (board_id);
CREATE INDEX IF NOT EXISTS board_gifts_owner_id_idx ON app_8574c59127_board_gifts (owner_id);
CREATE INDEX IF NOT EXISTS board_gifts_share_token_idx ON app_8574c59127_board_gifts (share_token);

-- Enable RLS
ALTER TABLE app_8574c59127_board_gifts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own gifts" ON app_8574c59127_board_gifts
  FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = claimed_by_user_id);

CREATE POLICY "Users can create gifts for their boards" ON app_8574c59127_board_gifts
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id AND 
    EXISTS (SELECT 1 FROM boards WHERE boards.id = board_id AND boards.user_id = auth.uid())
  );

CREATE POLICY "Anyone can view gifts by token" ON app_8574c59127_board_gifts
  FOR SELECT USING (true);

CREATE POLICY "Recipients can claim gifts" ON app_8574c59127_board_gifts
  FOR UPDATE USING (claimed_at IS NULL);
```

## Components to Create

### 1. GiftModal Component (`src/components/GiftModal.tsx`)
- Modal for creating a gift
- Fields: recipient name, recipient email (optional), gift message
- Generate unique share token
- Copy gift link functionality

### 2. ClaimGift Page (`src/pages/ClaimGift.tsx`)
- Public page accessible via `/gift/:token`
- Display gift details (sender, message, board preview)
- "Claim Gift" button (requires auth)
- After claiming, redirect to board view

### 3. MyGifts Page (`src/pages/MyGifts.tsx`)
- List of gifts sent by user
- List of gifts received by user
- Status indicators (unclaimed, claimed)
- View gift details

## API Functions to Add (`src/lib/api.ts`)

```typescript
export async function createBoardGift(
  boardId: string,
  recipientName: string,
  recipientEmail: string | null,
  giftMessage: string
): Promise<BoardGift>

export async function getGiftByToken(token: string): Promise<BoardGift | null>

export async function claimGift(token: string): Promise<void>

export async function getUserGiftsSent(): Promise<BoardGift[]>

export async function getUserGiftsReceived(): Promise<BoardGift[]>
```

## Type Definitions to Add (`src/lib/types.ts`)

```typescript
export interface BoardGift {
  id: string;
  board_id: string;
  owner_id: string;
  recipient_email: string | null;
  recipient_name: string;
  gift_message: string;
  share_token: string;
  claimed_at: string | null;
  claimed_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}
```

## Routes to Add (`src/App.tsx`)

```typescript
<Route path="/gift/:token" element={<ClaimGift />} />
<Route path="/my-gifts" element={<MyGifts />} />
```

## UI Integration Points

1. **ItemDetection Page**: Add "Gift This Board" button next to "Share" button
2. **Header**: Add "My Gifts" link in user menu
3. **Board Cards**: Add gift icon/indicator if board was received as gift

## User Flow

### Sending a Gift
1. User clicks "Gift This Board" on ItemDetection page
2. GiftModal opens with form
3. User fills in recipient details and message
4. System generates unique token and creates gift record
5. User copies gift link and shares via email/message

### Claiming a Gift
1. Recipient opens gift link (`/gift/:token`)
2. See gift preview with message from sender
3. Click "Claim Gift" (requires sign in if not authenticated)
4. Gift is marked as claimed
5. Board is copied to recipient's account
6. Redirect to board view

### Viewing Gifts
1. User navigates to "My Gifts" page
2. See two tabs: "Sent" and "Received"
3. View status of each gift
4. Click to view details or board

## Implementation Steps

1. ✅ Create database migration SQL
2. ⬜ Add type definitions
3. ⬜ Add API functions
4. ⬜ Create GiftModal component
5. ⬜ Create ClaimGift page
6. ⬜ Create MyGifts page
7. ⬜ Add routes to App.tsx
8. ⬜ Integrate "Gift" button in ItemDetection
9. ⬜ Add "My Gifts" link in Header
10. ⬜ Test full flow