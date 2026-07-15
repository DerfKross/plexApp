$ErrorActionPreference = "Stop"

if (-not (Test-Path ".env")) {
  Write-Host ".env is missing. Run .\scripts\setup-windows.ps1 first."
  exit 1
}

$logDir = Join-Path (Get-Location) "logs"
$outLogFile = Join-Path $logDir "plexapp.out.log"
$errLogFile = Join-Path $logDir "plexapp.err.log"

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
  -RedirectStandardOutput $outLogFile `
  -RedirectStandardError $errLogFile `
  -WindowStyle Hidden

Start-Sleep -Seconds 3

$listener = Get-NetTCPConnection -LocalPort 3747 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
  Write-Host "PlexApp is running."
  Write-Host "Local URL: http://localhost:3747"
  Write-Host "Home network URL: http://192.168.1.131:3747"
  Write-Host "Output log file: $outLogFile"
  Write-Host "Error log file: $errLogFile"
} else {
  Write-Host "PlexApp did not start listening on port 3747."
  Write-Host "Check the log files:"
  Write-Host $outLogFile
  Write-Host $errLogFile
  if (Test-Path $outLogFile) {
    Write-Host ""
    Write-Host "Last output log lines:"
    Get-Content $outLogFile -Tail 40
  }
  if (Test-Path $errLogFile) {
    Write-Host ""
    Write-Host "Last error log lines:"
    Get-Content $errLogFile -Tail 40
  }
}
