# AI-Powered Home Decor Shopping Assistant - Implementation Plan

## Project Overview
Build a Pinterest-like app where users upload room inspiration photos, AI identifies furniture/decor items, and the app searches multiple retailers for shoppable matches.

## Technology Stack
- Frontend: React + TypeScript + Shadcn-UI + Tailwind CSS
- Backend: Supabase (Auth, Database, Edge Functions)
- AI Vision: OpenAI Vision API (GPT-4 Vision)
- Styling: Clean Scandinavian aesthetic with white space, rounded cards

## Database Schema (Supabase Tables)

### 1. app_c64bd_boards
- id: uuid (primary key)
- user_id: uuid (references auth.users)
- name: text
- inspiration_image_url: text
- total_cost: decimal
- created_at: timestamp
- updated_at: timestamp

### 2. app_c64bd_detected_items
- id: uuid (primary key)
- board_id: uuid (references app_c64bd_boards)
- item_name: text
- category: text (sofa, rug, lamp, artwork, etc.)
- style: text (Scandinavian, modern, farmhouse, etc.)
- position_x: integer
- position_y: integer
- confidence: decimal
- created_at: timestamp

### 3. app_c64bd_products
- id: uuid (primary key)
- detected_item_id: uuid (references app_c64bd_detected_items)
- product_name: text
- retailer: text (Amazon, Wayfair, Walmart, IKEA, Bouclair, Home Depot)
- price: decimal
- currency: text
- image_url: text
- product_url: text
- rating: decimal
- review_count: integer
- shipping_info: text
- availability: text
- created_at: timestamp

### 4. app_c64bd_saved_items
- id: uuid (primary key)
- board_id: uuid (references app_c64bd_boards)
- product_id: uuid (references app_c64bd_products)
- created_at: timestamp

## Edge Functions

### 1. app_c64bd_analyze_image
- Purpose: Analyze uploaded image using OpenAI Vision API
- Input: image_url, board_id
- Process:
  - Call OpenAI Vision API with prompt to identify furniture/decor items
  - Extract item names, categories, positions, styles
  - Store detected items in app_c64bd_detected_items table
- Output: Array of detected items with metadata

### 2. app_c64bd_search_products
- Purpose: Search multiple retailers for product matches
- Input: item_name, category, style
- Process:
  - Modular search system with retailer-specific logic
  - Query Amazon, Wayfair, Walmart, IKEA, Bouclair, Home Depot APIs
  - Normalize product data (price, images, ratings, etc.)
  - Store results in app_c64bd_products table
- Output: Array of product matches from all retailers

### 3. app_c64bd_create_board
- Purpose: Create new room board
- Input: user_id, name, inspiration_image_url
- Process: Insert into app_c64bd_boards table
- Output: board_id

### 4. app_c64bd_save_item
- Purpose: Save product to room board
- Input: board_id, product_id
- Process: Insert into app_c64bd_saved_items table
- Output: success status

## Frontend Components Structure

### Pages
1. src/pages/Home.tsx - Landing page with hero section
2. src/pages/Upload.tsx - Image upload interface
3. src/pages/Analyzing.tsx - AI analyzing animation screen
4. src/pages/ItemDetection.tsx - Show detected items with clickable tags
5. src/pages/ProductMatches.tsx - Display product matches with comparison
6. src/pages/RoomBoard.tsx - Saved items board with total cost
7. src/pages/MyBoards.tsx - List of all user's saved boards
8. src/pages/Auth.tsx - Login/signup page

### Components
1. src/components/ImageUploader.tsx - Drag-drop image upload
2. src/components/DetectedItemTag.tsx - Clickable tag overlay on image
3. src/components/ProductCard.tsx - Product display card
4. src/components/PriceComparison.tsx - Side-by-side price comparison
5. src/components/BoardSummary.tsx - Board cost summary
6. src/components/ShareBoard.tsx - Share/export board functionality
7. src/components/RetailerFilter.tsx - Filter products by retailer
8. src/components/StyleBadge.tsx - Display detected style tags
9. src/components/LoadingSpinner.tsx - Loading animation
10. src/components/Header.tsx - Navigation header
11. src/components/AuthButton.tsx - Login/logout button

### Utilities
1. src/lib/supabase.ts - Supabase client configuration
2. src/lib/api.ts - API helper functions
3. src/lib/types.ts - TypeScript interfaces
4. src/lib/constants.ts - App constants (retailers, categories, styles)

## User Flow

1. **Home Screen** → Upload button
2. **Upload Screen** → User uploads image → Triggers AI analysis
3. **Analyzing Screen** → Shows loading animation → Calls app_c64bd_analyze_image
4. **Item Detection Screen** → Shows image with clickable tags → User clicks item
5. **Product Matches Screen** → Shows products from all retailers → User compares prices
6. **Room Board Screen** → User saves items → Shows total cost → Share/export options

## Styling Guidelines
- Color Palette: White (#FFFFFF), Soft Gray (#F5F5F5), Charcoal (#333333), Accent Blue (#4A90E2)
- Typography: Clean sans-serif (Inter or similar)
- Cards: Rounded corners (border-radius: 12px), subtle shadows
- Spacing: Generous white space, 16px/24px/32px grid
- Images: Large, high-quality, rounded corners
- Buttons: Soft rounded, hover states, clear CTAs

## Implementation Order

### Phase 1: Backend Setup (WAITING FOR SUPABASE CONNECTION)
- [ ] Create database tables with RLS policies
- [ ] Create edge function: app_c64bd_analyze_image
- [ ] Create edge function: app_c64bd_search_products
- [ ] Create edge function: app_c64bd_create_board
- [ ] Create edge function: app_c64bd_save_item

### Phase 2: Core Frontend
- [ ] Set up Supabase client configuration
- [ ] Create TypeScript interfaces and types
- [ ] Build Home page with hero section
- [ ] Build Upload page with image uploader component
- [ ] Build Analyzing page with loading animation

### Phase 3: AI & Detection
- [ ] Build ItemDetection page with clickable tags
- [ ] Implement DetectedItemTag component
- [ ] Connect to app_c64bd_analyze_image edge function
- [ ] Display detected items with style badges

### Phase 4: Product Search & Comparison
- [ ] Build ProductMatches page
- [ ] Create ProductCard component
- [ ] Create PriceComparison component
- [ ] Create RetailerFilter component
- [ ] Connect to app_c64bd_search_products edge function

### Phase 5: Room Board & Persistence
- [ ] Build RoomBoard page
- [ ] Create BoardSummary component
- [ ] Implement save/delete item functionality
- [ ] Build MyBoards page to list all boards
- [ ] Create ShareBoard component (share/export)

### Phase 6: Authentication
- [ ] Build Auth page (login/signup)
- [ ] Implement Supabase authentication
- [ ] Add protected routes
- [ ] Create AuthButton component

### Phase 7: Polish & Testing
- [ ] Add loading states and error handling
- [ ] Implement responsive design
- [ ] Add animations and transitions
- [ ] Test all user flows
- [ ] Run lint and build checks

## API Integration Notes

### OpenAI Vision API
- Endpoint: https://api.openai.com/v1/chat/completions
- Model: gpt-4-vision-preview
- Prompt template: "Analyze this room image and identify all furniture and decor items. For each item, provide: name, category, style, and approximate position in the image."

### Retailer APIs (Modular Design)
- Each retailer will have its own search function
- Normalize response format across all retailers
- Handle rate limits and errors gracefully
- Future: Add affiliate link support

## Environment Variables Needed (Supabase Edge Functions)
- OPENAI_API_KEY - For AI vision analysis
- SUPABASE_URL - Auto-provided
- SUPABASE_SERVICE_ROLE_KEY - Auto-provided

## Future Enhancements
- Affiliate link integration
- User preferences and saved searches
- Price drop alerts
- AR visualization (place items in your room)
- Social sharing features
- Collaborative boards