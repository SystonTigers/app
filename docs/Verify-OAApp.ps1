Param(
  [string]$AppRoot = "C:\Users\clayt\OneDrive\Desktop\Final Products\OA App\applatest",
  [string]$DocsDir = "C:\Users\clayt\OneDrive\Desktop\Final Products\OA App\applatest\docs"
)

Write-Host "=== OA App Verification Script ===" -ForegroundColor Cyan
Write-Host "Root: $AppRoot"
Write-Host "Docs: $DocsDir"
$ErrorActionPreference = 'SilentlyContinue'

function Test-File { param($Path) if(Test-Path $Path){ "✅ $Path" } else { "❌ $Path (missing)" } }
function Has-Text { param($Path, $Pattern) if(Test-Path $Path -and (Select-String -Path $Path -Pattern $Pattern -Quiet)){ "✅ $Path contains '$Pattern'" } else { "❌ $Path missing '$Pattern'"} }
function Count-Matches { param($Path, $Pattern)
  if(!(Test-Path $Path)){ return @{ Count=0; Ok=$false; Msg="❌ $Path (missing)" } }
  $c = (Select-String -Path $Path -Pattern $Pattern -AllMatches).Matches.Count
  return @{ Count=$c; Ok=($c -gt 0); Msg=(if($c -gt 0){"✅ $Path matches '$Pattern' x$c"}else{"❌ $Path found 0 matches for '$Pattern'"}) }
}

$results = @()

# --- 1) Backend structure & critical files ---
$backend = Join-Path $AppRoot "backend\src"
$results += Test-File (Join-Path $AppRoot "backend\wrangler.toml")
$results += Test-File (Join-Path $AppRoot "backend\package.json")
$results += Test-File (Join-Path $AppRoot "backend\src\index.ts")
$results += Test-File (Join-Path $AppRoot "backend\src\router.ts")
$results += Test-File (Join-Path $AppRoot "backend\src\env.d.ts")
$results += Test-File (Join-Path $AppRoot "backend\src\schema\d1.sql")

# utils
$utils = @("response.ts","time.ts","hash.ts","featureFlags.ts","svg.ts","base64.ts")
foreach($u in $utils){ $results += Test-File (Join-Path $backend "utils\$u") }

# middleware
$mw = @("auth.ts","tenant.ts","json.ts","errors.ts")
foreach($m in $mw){ $results += Test-File (Join-Path $backend "middleware\$m") }

# services
$services = @("teams.ts","matches.ts","events.ts","stats.ts","slogans.ts","weather.ts","fx.ts","locale.ts","render.ts","usage.ts","shop.ts","push.ts")
foreach($s in $services){ $results += Test-File (Join-Path $backend "services\$s") }

# cron
$cron = @("daily.ts","league.ts","throwback.ts","cleanup.ts")
foreach($c in $cron){ $results += Test-File (Join-Path $backend "cron\$c") }

# templates (examples)
$tpl = @(
  "final-score-v1.svg","final-score-v1.json",
  "final-score-story-v1.svg","final-score-story-v1.json",
  "lineup-v1.svg","lineup-v1.json",
  "countdown-v1.svg","countdown-v1.json",
  "birthday-v1.svg","birthday-v1.json",
  "motm-v1.svg","motm-v1.json"
)
foreach($t in $tpl){ $results += Test-File (Join-Path $backend "templates\examples\$t") }

# wrangler checks: wasm module, cron lines
$wrangler = Join-Path $AppRoot "backend\wrangler.toml"
$results += Has-Text $wrangler "\[wasm_modules\]"
$results += Has-Text $wrangler "RESVG_WASM"
$cronLines = @("0 6 * * *","0 8 * * *","0 \*/6 \* \* \*","0 19 \* \* 4","\*/5 \* \* \* \*")
foreach($line in $cronLines){ $results += Has-Text $wrangler $line }

# router routes: spot-check key endpoints
$router = Join-Path $AppRoot "backend\src\router.ts"
$routesToSee = @(
  "/health","/weather","/fx","/locale","/maplink","/auth/signup","/team/create","/team/invite",
  "/fixtures/next","/matches/:id/events","/stats/team","/stats/players","/events/live",
  "/league/table","/slogan","/render","/usage/make/allowed","/usage/make/increment","/shop/customize","/push/register","/push/send"
)
foreach($r in $routesToSee){ $results += Has-Text $router [regex]::Escape($r) }

# index.ts: scheduled handler present?
$index = Join-Path $AppRoot "backend\src\index.ts"
$results += Has-Text $index "scheduled: async \(event: ScheduledEvent"

# renderer: resvg init and R2 put
$render = Join-Path $AppRoot "backend\src\services\render.ts"
$results += Has-Text $render "@resvg/resvg-wasm"
$results += Has-Text $render "env.R2.put"

# --- 2) Mobile app checks ---
$mobile = Join-Path $AppRoot "mobile"
$results += Test-File (Join-Path $mobile "package.json")
$results += Test-File (Join-Path $mobile "app.json")
$results += Test-File (Join-Path $mobile "babel.config.js")
$results += Test-File (Join-Path $mobile "src\App.tsx")

# i18n
$results += Test-File (Join-Path $mobile "src\i18n\en.json")
$results += Test-File (Join-Path $mobile "src\i18n\es.json")
$results += Test-File (Join-Path $mobile "src\i18n\fr.json")

# components & screens
$uiFiles = @(
  "src\components\ui\Card.tsx","src\components\ui\CTA.tsx","src\components\ui\SectionHeader.tsx","src\components\ui\UsageBar.tsx",
  "src\screens\Onboarding.tsx","src\screens\LiveMatch.tsx","src\screens\Calendar.tsx","src\screens\Payments.tsx","src\screens\Shop.tsx","src\screens\Settings.tsx",
  "src\screens\TeamMembers.tsx"
)
foreach($f in $uiFiles){ $results += Test-File (Join-Path $mobile $f) }

# TeamMembers: role-change paths exist?
$tm = Join-Path $mobile "src\screens\TeamMembers.tsx"
$results += Has-Text $tm "update\(\{ role"
$results += Has-Text $tm "delete\(\)"

# assets exist?
$results += Test-File (Join-Path $mobile "assets\icon.png")
$results += Test-File (Join-Path $mobile "assets\adaptive-icon.png")
$results += Test-File (Join-Path $mobile "assets\splash.png")

# package.json sanity: required deps present
$mpkg = Join-Path $mobile "package.json"
$needDeps = @("expo","@react-navigation/native","@react-navigation/native-stack","expo-image-picker","expo-localization","@supabase/supabase-js")
foreach($d in $needDeps){ $results += Has-Text $mpkg "`"$d`"" }

# --- 3) Docs completeness ---
$progress = Join-Path $DocsDir "IMPLEMENTATION_PROGRESS.md"
$results += Test-File $progress
if(Test-Path $progress){
  $match = Count-Matches $progress "32 of 32 tasks completed|ALL 32 TASKS COMPLETE|100%"
  $results += $match.Msg
}

# BLUEPRINT exists?
$results += Test-File (Join-Path $DocsDir "BLUEPRINT_V7_MASTER.md")

# MAKE blueprints present?
$makeDir = Join-Path $DocsDir "MAKE"
$makeFiles = @("README.md","bundle.json","live_match_update.json","league_table_sync.json","daily_posts.json","fixture_countdown.json","throwback_thursday.json","usage_counter_example.json")
foreach($mf in $makeFiles){ $results += Test-File (Join-Path $makeDir $mf) }

# --- 4) Quick dir diff (docs vs root) - just prints counts & hash snapshot ---
Write-Host "`n=== Directory overview ===" -ForegroundColor Yellow
$allFiles = Get-ChildItem -Path $AppRoot -Recurse -File | Where-Object { $_.FullName -notmatch "\\node_modules\\" }
$docFiles = Get-ChildItem -Path $DocsDir -Recurse -File
"Total files under app root (excl node_modules): " + $allFiles.Count
"Total docs files: " + $docFiles.Count

# small hash sample
$sample = $allFiles | Get-Random -Count ([Math]::Min(10, $allFiles.Count))
$hashes = foreach($f in $sample){ try{ (Get-FileHash $f.FullName -Algorithm SHA256) | Select-Object Path,Hash } catch{} }
"Sample hashes:"
$hashes | Format-Table -AutoSize | Out-String | Write-Host

# --- 5) Print summary ---
Write-Host "`n=== Checks ===" -ForegroundColor Yellow
$results | ForEach-Object { Write-Host $_ }

# Exit with code 1 if any ❌ found
if($results -match "❌"){
  Write-Host "`nFAILED: One or more items missing." -ForegroundColor Red
  exit 1
} else {
  Write-Host "`nPASS: All required files and content patterns found." -ForegroundColor Green
  exit 0
}
