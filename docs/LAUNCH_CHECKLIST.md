# Homable Launch Checklist

Complete this checklist before going live with homablecreations.com.

## ✅ P0: Critical Issues (MUST FIX BEFORE LAUNCH)

### 1. Storage Bucket Setup ⚠️ **REQUIRES MANUAL ACTION**

**Status:** ❌ Not Complete - Requires Supabase Dashboard Access

**Steps to Complete:**

1. **Create Storage Bucket**
   - Go to: Supabase Dashboard → Storage
   - Click "New bucket"
   - Bucket name: `inspiration-images` (exactly this, case-sensitive)
   - Public bucket: ✅ YES
   - File size limit: 10 MB
   - Allowed MIME types: `image/jpeg, image/jpg, image/png, image/webp, image/gif`

2. **Set Storage Policies**
   - Go to: Supabase Dashboard → SQL Editor
   - Copy SQL from: `/workspace/shadcn-ui/supabase/migrations/20241203_metrics_dashboard.sql`
   - Look for the section starting with `-- Create storage bucket for inspiration images`
   - Run the SQL

3. **Verify Bucket Works**
   - Test upload on localhost
   - Check browser console for errors
   - Verify image appears in Storage bucket

**How to Test:**
```bash
# On localhost
1. Go to http://localhost:5173
2. Click "Upload Inspiration"
3. Select an image
4. Check browser console - should see no "Bucket not found" errors
5. Verify image uploaded in Supabase Dashboard → Storage → inspiration-images
```

---

### 2. Domain Setup ⚠️ **REQUIRES DEPLOYMENT**

**Status:** ❌ Not Complete - Requires Hosting Provider

**Steps to Complete:**

1. **Choose Hosting Provider**
   - Recommended: Vercel (easiest) or Netlify
   - Alternative: Cloudflare Pages, AWS Amplify

2. **Deploy to Vercel (Recommended)**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   
   # Deploy from project root
   cd /workspace/shadcn-ui
   vercel
   
   # Follow prompts:
   # - Link to existing project? No
   # - Project name: homable
   # - Directory: ./
   # - Build command: pnpm run build
   # - Output directory: dist
   ```

3. **Set Environment Variables in Vercel**
   - Go to: Vercel Dashboard → Project → Settings → Environment Variables
   - Add:
     - `VITE_SUPABASE_URL` = `https://jvbrrgqepuhabwddufby.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2YnJyZ3FlcHVoYWJ3ZGR1ZmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTQzODIsImV4cCI6MjA4MDE5MDM4Mn0.aoAyKQyZZwrTbocGqKLxai1kUccAvcY45-B06huKPGo`

4. **Configure Custom Domain**
   - Go to: Vercel Dashboard → Project → Settings → Domains
   - Add domain: `homablecreations.com`
   - Add domain: `www.homablecreations.com`
   - Follow DNS instructions provided by Vercel

5. **Update DNS Records**
   - Go to your domain registrar (GoDaddy, Namecheap, etc.)
   - Add DNS records as instructed by Vercel
   - Typically:
     - A record: `@` → Vercel IP
     - CNAME record: `www` → `cname.vercel-dns.com`

6. **Update Supabase CORS**
   - Go to: Supabase Dashboard → Settings → API → CORS
   - Add allowed origins:
     - `https://homablecreations.com`
     - `https://www.homablecreations.com`

**How to Test:**
```bash
# After DNS propagates (5-30 minutes)
1. Visit https://homablecreations.com
2. Test full user flow:
   - Sign up
   - Upload image
   - View results
   - Click product links
3. Check browser console for errors
4. Verify affiliate tags in product URLs
```

---

### 3. Affiliate Link Validation ✅ **SCRIPT READY**

**Status:** ✅ Script Created - Ready to Run

**Steps to Complete:**

1. **Set Environment Variable**
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"
   ```

2. **Run Validation (Dry Run)**
   ```bash
   cd /workspace/shadcn-ui
   npx tsx scripts/validate_affiliate_links.ts
   ```

3. **Review Results**
   - Check how many links need fixing
   - Review example issues shown

4. **Fix Links Automatically**
   ```bash
   npx tsx scripts/validate_affiliate_links.ts --fix
   ```

5. **Verify in Database**
   - Go to: Supabase Dashboard → Table Editor → products
   - Filter: `merchant = 'Amazon'`
   - Check `product_url` contains `tag=homable0f-20`

**Expected Results:**
- All Amazon.ca links should have `tag=homable0f-20`
- No broken URLs (all start with http/https)
- Other merchants (Walmart, Wayfair) validated

---

### 4. Metrics Dashboard ✅ **SQL READY**

**Status:** ✅ SQL Created - Ready to Run

**Steps to Complete:**

1. **Run SQL Migration**
   - Go to: Supabase Dashboard → SQL Editor
   - Copy contents of: `/workspace/shadcn-ui/supabase/migrations/20241203_metrics_dashboard.sql`
   - Paste and click "Run"

2. **Verify Views Created**
   ```sql
   SELECT table_name 
   FROM information_schema.views 
   WHERE table_schema = 'public' 
   AND table_name LIKE 'analytics_%';
   ```

3. **Test Queries**
   ```sql
   -- Today's metrics
   SELECT * FROM analytics_daily_summary WHERE date = CURRENT_DATE;
   
   -- Total potential purchases
   SELECT COUNT(*) FROM analytics_product_clicks;
   
   -- Merchant performance
   SELECT * FROM analytics_merchant_performance;
   ```

4. **Bookmark Key Queries**
   - Save frequently used queries in SQL Editor
   - Create dashboard in your preferred tool (Metabase, Retool, etc.)

**Documentation:** See `/workspace/shadcn-ui/docs/METRICS_DASHBOARD_GUIDE.md`

---

### 5. OpenAI Configuration ✅ **VERIFIED**

**Status:** ✅ Configuration Verified

**Edge Functions Using OpenAI:**
- `app_8574c59127_analyze_image` - Image analysis

**Environment Variables Required:**
- `OPENAI_API_KEY` - Set in Supabase Dashboard → Edge Functions → Secrets

**Steps to Verify:**

1. **Check Environment Variable**
   - Go to: Supabase Dashboard → Edge Functions → Secrets
   - Verify `OPENAI_API_KEY` is set

2. **Test Edge Function**
   ```bash
   # Test locally
   supabase functions serve app_8574c59127_analyze_image
   
   # Or test via Supabase Dashboard
   # Go to: Edge Functions → app_8574c59127_analyze_image → Invoke
   ```

3. **Monitor Usage**
   - Check OpenAI Dashboard for API usage
   - Set up billing alerts if needed

**Rate Limiting:**
- Current implementation has no rate limiting
- Consider adding rate limits if costs spike

---

## 📊 Performance Optimization (OPTIONAL)

### AI Analysis Speed

**Current Status:** Analysis takes 10-15 seconds

**Potential Improvements:**

1. **Enable Streaming** (Requires Code Changes)
   ```typescript
   // In edge function app_8574c59127_analyze_image
   // Use OpenAI streaming API
   const stream = await openai.chat.completions.create({
     model: "gpt-4-vision-preview",
     messages: [...],
     stream: true,
   });
   ```

2. **Optimize Image Processing**
   - Resize images before sending to OpenAI
   - Use lower resolution for faster processing
   - Cache results for similar images

3. **Parallel Processing**
   - Detect items and search products simultaneously
   - Use Promise.all() for concurrent operations

**Trade-offs:**
- Faster processing = Higher costs
- Lower quality = Faster but less accurate
- Caching = Complexity but better UX

**Recommendation:** Monitor user feedback first, optimize if users complain about speed.

---

## 🧪 Testing Checklist

### Pre-Launch Testing (on localhost)

- [ ] Sign up with email
- [ ] Sign up with Google OAuth
- [ ] Upload image (logged in)
- [ ] Upload image (logged out)
- [ ] View analysis results
- [ ] Click product links
- [ ] Verify affiliate tags in URLs
- [ ] Delete board
- [ ] Sign out and sign back in

### Post-Launch Testing (on homablecreations.com)

- [ ] All localhost tests pass on production
- [ ] HTTPS works (no mixed content errors)
- [ ] Images load correctly
- [ ] Affiliate links work
- [ ] Analytics tracking works
- [ ] Mobile responsive design works
- [ ] Cross-browser testing (Chrome, Safari, Firefox)

---

## 📈 Post-Launch Monitoring

### Week 1 Checklist

- [ ] Monitor error logs daily (Supabase Dashboard → Logs)
- [ ] Check metrics dashboard daily
- [ ] Verify affiliate link clicks are tracked
- [ ] Monitor OpenAI API costs
- [ ] Check user feedback/support requests
- [ ] Test edge cases reported by users

### Week 2-4 Checklist

- [ ] Review weekly metrics trends
- [ ] Optimize slow queries if needed
- [ ] Add missing product categories if needed
- [ ] Improve match quality based on feedback
- [ ] Consider A/B testing improvements

---

## 🚨 Emergency Contacts

**If something breaks:**

1. **Check Logs**
   - Supabase Dashboard → Logs
   - Browser Console (F12)
   - Vercel Dashboard → Deployments → Logs

2. **Rollback if Needed**
   - Vercel: Dashboard → Deployments → Previous deployment → Promote
   - Supabase: Dashboard → SQL Editor → Run previous migration

3. **Common Issues**
   - 401 errors: Check environment variables
   - 404 errors: Check routing configuration
   - CORS errors: Check Supabase CORS settings
   - Storage errors: Check bucket policies

---

## ✅ Final Launch Checklist

Before announcing launch:

- [ ] Storage bucket created and tested
- [ ] Domain connected and working
- [ ] Affiliate links validated
- [ ] Metrics dashboard running
- [ ] OpenAI API configured
- [ ] All tests passing on production
- [ ] Error monitoring set up
- [ ] Backup plan ready

**You're ready to launch! 🚀**