#!/bin/bash
# Script to set up Cloudflare Workers secrets
# Run this after removing secrets from wrangler.toml

echo "🔐 Setting up Cloudflare Workers Secrets"
echo "=========================================="
echo ""
echo "This will set the following secrets:"
echo "  - BACKEND_API_KEY"
echo "  - GAS_HMAC_SECRET"
echo ""
echo "Generated secure values:"
echo ""
echo "BACKEND_API_KEY=f752ed7c0edd133b2a897c823331e0d3740faf729fd5c1ec8d2067d45e7b3cf3"
echo "GAS_HMAC_SECRET=243a2a4e95209ee73735c45647b0e7c58fe64506528c4735489c8d17623367fc"
echo ""
echo "=========================================="
echo ""
echo "Setting secrets for PRODUCTION environment..."
echo ""

# Production
echo "f752ed7c0edd133b2a897c823331e0d3740faf729fd5c1ec8d2067d45e7b3cf3" | wrangler secret put BACKEND_API_KEY --env production
echo "243a2a4e95209ee73735c45647b0e7c58fe64506528c4735489c8d17623367fc" | wrangler secret put GAS_HMAC_SECRET --env production

echo ""
echo "Setting secrets for PREVIEW environment..."
echo ""

# Preview
echo "f752ed7c0edd133b2a897c823331e0d3740faf729fd5c1ec8d2067d45e7b3cf3" | wrangler secret put BACKEND_API_KEY --env preview
echo "243a2a4e95209ee73735c45647b0e7c58fe64506528c4735489c8d17623367fc" | wrangler secret put GAS_HMAC_SECRET --env preview

echo ""
echo "✅ Secrets configured successfully!"
echo ""
echo "⚠️  IMPORTANT: Update your Google Apps Script to use the new GAS_HMAC_SECRET:"
echo "   243a2a4e95209ee73735c45647b0e7c58fe64506528c4735489c8d17623367fc"
