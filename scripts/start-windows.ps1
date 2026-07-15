$ErrorActionPreference = "Stop"

if (-not (Test-Path ".env")) {
  Write-Host ".env is missing. Run .\scripts\setup-windows.ps1 first."
  exit 1
}

Write-Host "Starting PlexApp..."
Write-Host "Local URL: http://localhost:3747"
Write-Host "Home network URL: http://192.168.1.131:3747"
npm start
