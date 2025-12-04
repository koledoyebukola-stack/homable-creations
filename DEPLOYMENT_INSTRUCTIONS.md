# DecorAI - Deployment Instructions

## Overview
This is a complete AI-powered home decor shopping assistant application. The frontend is fully built and ready to preview. You need to complete the backend setup in your Supabase dashboard.

## ✅ Completed
- Frontend application with all pages and components
- Supabase client configuration
- TypeScript types and API functions
- Responsive design with Scandinavian aesthetic
- Authentication flow
- Image upload and preview
- Product browsing and comparison
- Room board management

## 🔧 Required Backend Setup

### Step 1: Create Database Tables
1. Open your Supabase dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `supabase_setup.sql`
4. Click **Run** to execute the SQL script

This will create:
- `app_8574c59127_boards` - User's room boards
- `app_8574c59127_detected_items` - AI-detected furniture/decor items
- `app_8574c59127_products` - Product matches from retailers
- `app_8574c59127_saved_items` - User's saved products

All tables include Row Level Security (RLS) policies to protect user data.

### Step 2: Create Storage Bucket
1. Go to **Storage** in your Supabase dashboard
2. Click **Create a new bucket**
3. Name it: `images`
4. Set it as **Public bucket**
5. Click **Create bucket**

### Step 3: Deploy Edge Functions

#### Function 1: app_8574c59127_analyze_image
1. Go to **Edge Functions** in your Supabase dashboard
2. Click **Create a new function**
3. Name: `app_8574c59127_analyze_image`
4. Copy the code from `supabase/functions/app_8574c59127_analyze_image/index.ts`
5. Paste it into the function editor
6. Click **Deploy**

#### Function 2: app_8574c59127_search_products
1. Click **Create a new function**
2. Name: `app_8574c59127_search_products`
3. Copy the code from `supabase/functions/app_8574c59127_search_products/index.ts`
4. Paste it into the function editor
5. Click **Deploy**

### Step 4: Configure Environment Variables
1. Go to **Edge Functions** → **Secrets**
2. Add the following secret:
   - Key: `OPENAI_API_KEY`
   - Value: Your OpenAI API key (get one at https://platform.openai.com/api-keys)

Note: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available.

### Step 5: Enable Email Authentication
1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Configure email templates if desired
4. Set up redirect URLs:
   - Add your deployment URL to **Site URL**
   - Add your deployment URL to **Redirect URLs**

## 🚀 Testing the Application

### 1. Sign Up / Sign In
- Navigate to `/auth`
- Create a new account or sign in
- Verify your email if required

### 2. Upload Room Image
- Click "Start Your Search" on the home page
- Upload a room inspiration photo
- Enter a board name
- Click "Analyze with AI"

### 3. View Detected Items
- Wait for AI analysis to complete
- View detected furniture and decor items
- Click on any item to find products

### 4. Browse Products
- View product matches from multiple retailers
- Compare prices and ratings
- Save items to your board
- Visit retailer websites

### 5. Manage Boards
- View all your boards in "My Boards"
- See saved items and total cost
- Delete boards when done

## 🎨 Features

### User Features
- ✅ AI-powered image analysis using GPT-4 Vision
- ✅ Multi-retailer product search (Amazon, Wayfair, IKEA, Walmart, Bouclair, Home Depot)
- ✅ Room board creation and management
- ✅ Product saving and comparison
- ✅ Total cost calculation
- ✅ User authentication and data protection

### Technical Features
- ✅ React + TypeScript + Vite
- ✅ Shadcn-UI components
- ✅ Tailwind CSS styling
- ✅ Supabase backend (Auth, Database, Storage, Edge Functions)
- ✅ Row Level Security (RLS)
- ✅ Responsive design
- ✅ Protected routes
- ✅ Error handling and loading states

## 📝 Notes

### Current Implementation
- The `app_8574c59127_search_products` edge function currently generates mock product data
- This allows you to test the full user flow without needing real retailer API keys
- Product images use the placeholder image at `/assets/furniture-collection.jpg`

### Future Enhancements
To integrate real retailer APIs:
1. Sign up for API access with retailers (Amazon Product Advertising API, etc.)
2. Add API keys to Supabase Edge Function secrets
3. Update `app_8574c59127_search_products` function to call real APIs
4. Implement proper product image fetching
5. Add affiliate link tracking (optional)

### Storage Setup
If image upload fails:
1. Verify the `images` bucket exists and is public
2. Check Storage policies allow authenticated users to upload
3. You may need to add a storage policy:
```sql
CREATE POLICY "Users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');
```

## 🐛 Troubleshooting

### Authentication Issues
- Verify email provider is enabled
- Check redirect URLs are configured
- Ensure users verify their email

### Image Upload Fails
- Check storage bucket exists and is public
- Verify storage policies allow uploads
- Check file size limits

### Edge Functions Not Working
- Verify functions are deployed
- Check function logs for errors
- Ensure OPENAI_API_KEY is set
- Verify CORS headers are correct

### Database Errors
- Verify all tables were created successfully
- Check RLS policies are enabled
- Ensure user is authenticated

## 📞 Support

If you encounter any issues:
1. Check the browser console for errors
2. Check Supabase function logs
3. Verify all environment variables are set
4. Ensure database tables and RLS policies are created

## 🎉 Ready to Deploy!

Once you've completed all backend setup steps:
1. The application is ready to use
2. Preview it in the App Viewer
3. Click Publish to deploy
4. Share the link with others

Enjoy your AI-powered home decor shopping assistant! 🏠✨