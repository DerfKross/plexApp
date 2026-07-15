$ErrorActionPreference = "Stop"

if (-not (Test-Path ".env")) {
  Write-Host ".env is missing. Run .\scripts\setup-windows.ps1 first."
  exit 1
}

$logDir = Join-Path (Get-Location) "logs"
$logFile = Join-Path $logDir "plexapp.log"

if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

$existing = Get-NetTCPConnection -LocalPort 3747 -State Listen -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "PlexApp already appears to be listening on port 3747."
  $existing | Format-Table LocalAddress,LocalPort,State,OwningProcess -AutoSize
  exit 0
}

Write-Host "Starting PlexApp in the background..."
Start-Process `
  -FilePath "npm.cmd" `
  -ArgumentList "start" `
  -WorkingDirectory (Get-Location) `
  -RedirectStandardOutput $logFile `
  -RedirectStandardError $logFile `
  -WindowStyle Hidden

Start-Sleep -Seconds 3

$listener = Get-NetTCPConnection -LocalPort 3747 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
  Write-Host "PlexApp is running."
  Write-Host "Local URL: http://localhost:3747"
  Write-Host "Home network URL: http://192.168.1.131:3747"
  Write-Host "Log file: $logFile"
} else {
  Write-Host "PlexApp did not start listening on port 3747."
  Write-Host "Check the log file: $logFile"
  if (Test-Path $logFile) {
    Get-Content $logFile -Tail 40
  }
}
