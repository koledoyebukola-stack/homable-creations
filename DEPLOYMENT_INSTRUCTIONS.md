# Edge Function Deployment Instructions

## Problem
The `app_8574c59127_proxy_image` edge function needs to be publicly accessible (no JWT verification) to allow browser clients to fetch MGX CDN images through the proxy. The Supabase dashboard UI doesn't provide an option to disable JWT verification.

## Solution
Deploy via Supabase CLI with the `--no-verify-jwt` flag.

## Prerequisites
1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link to your project:
   ```bash
   supabase link --project-ref jvbrrgqepuhabwddufby
   ```

## Deployment Steps

### Option 1: Using the deployment script (Recommended)
```bash
cd /workspace/shadcn-ui/supabase/functions/app_8574c59127_proxy_image
chmod +x deploy.sh
./deploy.sh
```

### Option 2: Manual deployment
```bash
cd /workspace/shadcn-ui
supabase functions deploy app_8574c59127_proxy_image \
  --project-ref jvbrrgqepuhabwddufby \
  --no-verify-jwt
```

## Verification

After deployment, test the endpoint:

```bash
curl 'https://jvbrrgqepuhabwddufby.supabase.co/functions/v1/app_8574c59127_proxy_image?url=https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-03/fdb0d855-fe6d-425e-b20c-fe5645947eb7.png' -I
```

Expected response:
```
HTTP/2 200
content-type: image/png
access-control-allow-origin: *
```

## What This Fixes

Once deployed with `--no-verify-jwt`:
- ✅ Browser clients can call the proxy without authentication
- ✅ MGX CDN images will load correctly in PDF generation
- ✅ Inspiration images will appear in "Get Carpenter Specifications" PDFs
- ✅ Vendor share images will render correctly

## Troubleshooting

If you still get 401 errors after deployment:
1. Verify the function was deployed with `--no-verify-jwt` by checking the deployment logs
2. Clear browser cache and try again
3. Check Supabase function logs for any errors

## Important Notes

- The `--no-verify-jwt` flag is required because browser clients don't have JWT tokens
- This is safe for a proxy function that only fetches public images
- The function validates input and includes rate limiting via Supabase's built-in protections