@echo off
rem Read-only: full backup of the production database + row counts per table.
title Claude - backing up production database (read-only)
set OPS=C:\dev\app-FRESH\claude-ops
cd /d C:\dev\app-FRESH\backend
echo Backing up the production database. This is read-only...
(
echo === row counts ===
call npx wrangler d1 execute syston-db --remote --env production --json --file %OPS%\row-counts.sql
echo === full backup ===
call npx wrangler d1 export syston-db --remote --env production --output %OPS%\prod-backup-%date:~-4%%date:~3,2%%date:~0,2%.sql
echo === DONE ===
) > "%OPS%\inspect.log" 2>&1
echo Finished. You can close this window.
timeout /t 10 >nul
