@echo off
title Claude - connect Wrangler to your Cloudflare account
cd /d C:\dev\app-FRESH\backend
echo A browser tab will open asking you to allow Wrangler to access Cloudflare.
echo Log in if asked, then click "Allow". This window closes itself afterwards.
call npx wrangler login > C:\dev\app-FRESH\claude-ops\login.log 2>&1
call npx wrangler whoami >> C:\dev\app-FRESH\claude-ops\login.log 2>&1
echo.
echo Done. You can close this window.
timeout /t 10 >nul
