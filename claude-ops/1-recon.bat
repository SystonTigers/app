@echo off
rem Read-only checks run by Claude. Changes nothing in Cloudflare or git.
title Claude - checking Cloudflare setup (read-only)
set OPS=C:\dev\app-FRESH\claude-ops
set LOG=%OPS%\recon.log
cd /d C:\dev\app-FRESH\backend
echo Checking your Cloudflare setup (read-only). This takes a minute...
(
echo === git ===
git -C C:\dev\app-FRESH status --short -b
git -C C:\dev\app-FRESH log --oneline -3
git -C C:\dev\app-FRESH remote -v
echo === node ===
node --version
echo === wrangler whoami ===
call npx wrangler whoami
echo === workers: app-production ===
call npx wrangler deployments list --name app-production
echo === workers: syston-postbus ===
call npx wrangler deployments list --name syston-postbus
echo === workers: app ===
call npx wrangler deployments list --name app
echo === d1 list ===
call npx wrangler d1 list
echo === secret names app-production ===
call npx wrangler secret list --env production
echo === secret names syston-postbus ===
call npx wrangler secret list --name syston-postbus
echo === r2 buckets ===
call npx wrangler r2 bucket list
echo === d1 migrations applied ===
call npx wrangler d1 execute syston-db --remote --env production --json --command "SELECT name FROM d1_migrations ORDER BY id"
echo === schema export ===
call npx wrangler d1 export syston-db --remote --env production --no-data --output %OPS%\prod-schema.sql
echo === DONE ===
) > "%LOG%" 2>&1
echo.
echo Finished. You can close this window.
timeout /t 15 >nul
