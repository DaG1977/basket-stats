$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$appPath = Join-Path $projectRoot "presentation-ui"

if (-not $env:SUPABASE_URL) {
  Write-Host "Chybí SUPABASE_URL." -ForegroundColor Yellow
  Write-Host "Příklad:" -ForegroundColor Yellow
  Write-Host '$env:SUPABASE_URL = ''https://your-project.supabase.co'''
  exit 1
}

if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
  Write-Host "Chybí SUPABASE_SERVICE_ROLE_KEY." -ForegroundColor Yellow
  Write-Host "Nejprve nastav service role key do aktuální PowerShell session." -ForegroundColor Yellow
  exit 1
}

Set-Location $appPath
node server.js
