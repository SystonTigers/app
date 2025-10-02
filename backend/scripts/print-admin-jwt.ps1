param(
  [Parameter(Mandatory=$true)]
  [string]$JwtSecret
)

$env:JWT_SECRET = $JwtSecret
node "$PSScriptRoot\make-admin-jwt.mjs"
