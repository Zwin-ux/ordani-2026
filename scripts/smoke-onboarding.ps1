# TinyMe onboarding smoke — activation path (no browser)
# Prereq: API on :8080 with API_KEY=dev-local-key, site on :4173
$ErrorActionPreference = "Stop"
$Api = if ($env:TINYME_API) { $env:TINYME_API.TrimEnd("/") } else { "http://127.0.0.1:8080" }
$Site = if ($env:TINYME_SITE) { $env:TINYME_SITE.TrimEnd("/") } else { "http://127.0.0.1:4173" }
$Key = if ($env:API_KEY) { $env:API_KEY } else { "dev-local-key" }

Write-Host "=== TinyMe onboarding smoke ==="
Write-Host "API  $Api"
Write-Host "Site $Site"

# 1) Health
$health = curl.exe -s "$Api/health"
if ($health -notmatch '"status"\s*:\s*"ok"') {
  throw "FAIL health: $health"
}
Write-Host "OK health"

# 2) Onboarding page activation copy (no sign-in wall)
# Join lines — PowerShell splits curl stdout into an array by default
$html = (curl.exe -s "$Site/onboarding") -join "`n"
$need = @("ob-world", 'data-plate="print"', "Create my link", "Create link", "Your short address", "Tiny link", "Full control", "Where will people see it", "Where should it open")
$ban = @("Continue with Google", "Sign in to create", "OB / 00", "Open full console", "API offline", "tiny.me/launch", "shop.example.com", "Tap · same link", "Where will it live")
foreach ($s in $need) {
  if ($html.IndexOf($s) -lt 0) { throw "FAIL page missing: $s" }
}
foreach ($s in $ban) {
  if ($html.IndexOf($s) -ge 0) { throw "FAIL page has banned copy: $s" }
}
Write-Host "OK world structure + activation copy"

# 3) JS loads
$code = curl.exe -s -o NUL -w "%{http_code}" "$Site/onboarding.js"
if ($code -ne "200") { throw "FAIL onboarding.js HTTP $code" }
Write-Host "OK onboarding.js"

# 4) Print plate is served
$assetCode = curl.exe -s -o NUL -w "%{http_code}" "$Site/assets/onboarding/world/ob-print.webp"
if ($assetCode -ne "200") { throw "FAIL ob-print.webp HTTP $assetCode" }
Write-Host "OK ob-print.webp"

# 5) Create link (same as silent onboarding defaults)
$slug = "obs$([guid]::NewGuid().ToString('N').Substring(0, 10))"
$bodyPath = Join-Path $env:TEMP "tinyme-ob-smoke.json"
[System.IO.File]::WriteAllText($bodyPath, "{`"destination`":`"https://ordanistudios.com/onboarding-smoke`",`"slug`":`"$slug`"}")
$create = curl.exe -s -w "`n%{http_code}" -X POST "$Api/api/links" `
  -H "Authorization: Bearer $Key" `
  -H "Content-Type: application/json" `
  --data-binary "@$bodyPath"
$lines = $create -split "`n"
$status = $lines[-1]
$json = ($lines[0..($lines.Length - 2)] -join "`n")
if ($status -ne "201") { throw "FAIL create HTTP $status body $json" }
if ($json -notmatch [regex]::Escape($slug)) { throw "FAIL create body missing slug" }
Write-Host "OK create $slug → 201"

Write-Host "=== PASS onboarding smoke ==="
exit 0
