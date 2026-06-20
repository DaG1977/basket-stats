Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectPath = Join-Path $PSScriptRoot 'importer-ui'

Write-Host "Starting CBF Importer UI..." -ForegroundColor Cyan
Write-Host "Project: $projectPath"
Write-Host "URL: http://localhost:3010"

Set-Location $projectPath
npm start
