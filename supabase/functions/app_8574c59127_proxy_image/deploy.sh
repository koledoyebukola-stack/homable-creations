#!/bin/bash

# Deploy the proxy edge function with JWT verification disabled
# This allows anonymous/public access from browser clients

echo "Deploying app_8574c59127_proxy_image with anonymous access..."

supabase functions deploy app_8574c59127_proxy_image \
  --project-ref jvbrrgqepuhabwddufby \
  --no-verify-jwt

echo "✅ Deployment complete!"
echo "Test the endpoint:"
echo "curl '/images/ImageProxy.jpg'"