# Checklists Feature - Development Plan

## Overview
Add a new core feature allowing users to save product matches as checklists and track their purchasing progress.

## Database Schema

### Table: `checklists`
```sql
- id: uuid (primary key)
- user_id: uuid (references auth.users)
- name: text
- board_id: uuid (references boards, nullable)
- created_at: timestamp
- updated_at: timestamp
```

### Table: `checklist_items`
```sql
- id: uuid (primary key)
- checklist_id: uuid (references checklists)
- item_name: text
- is_completed: boolean (default false)
- completed_at: timestamp (nullable)
- sort_order: integer
- created_at: timestamp
```

## Implementation Steps

### 1. Database Setup
- Create `checklists` table with RLS policies
- Create `checklist_items` table with RLS policies
- Set up proper foreign key relationships

### 2. Backend API Functions
- Create edge function: `app_8574c59127_create_checklist`
  - Input: user_id, name, board_id, items[]
  - Output: checklist record
- Create edge function: `app_8574c59127_update_checklist_item`
  - Input: item_id, is_completed
  - Output: updated item

### 3. Frontend Components
- `src/pages/Checklists.tsx` - Overview page listing all checklists
- `src/pages/ChecklistDetail.tsx` - Detail page for single checklist
- `src/components/ChecklistItem.tsx` - Individual checklist item component
- Update `src/components/Header.tsx` - Add "Checklists" nav item with "New" badge

### 4. API Integration
- `src/lib/api.ts` - Add checklist-related API functions:
  - `createChecklist(name, boardId, items)`
  - `getUserChecklists()`
  - `getChecklistById(id)`
  - `updateChecklistItem(itemId, isCompleted)`
  - `updateChecklistName(checklistId, name)`

### 5. Results Page Integration
- Add "Save as Checklist" button to ProductMatches page
- Extract product names from matches
- Create checklist and redirect to detail page

### 6. Routing
- Add routes in `src/App.tsx`:
  - `/checklists` - Overview page
  - `/checklists/:id` - Detail page

## Design Guidelines
- Match existing Homable design system
- Use shadcn-ui components (Checkbox, Card, Button, Badge)
- Maintain consistent color scheme (#111111 for primary text, etc.)
- Responsive design for mobile and desktop

## Testing Checklist
- [ ] Create checklist from Results page
- [ ] View all checklists in overview
- [ ] Open checklist detail page
- [ ] Toggle items between pending/completed
- [ ] Edit checklist name
- [ ] Progress calculation updates correctly
- [ ] Google search links work
- [ ] RLS policies prevent unauthorized access
- [ ] Mobile responsive design works