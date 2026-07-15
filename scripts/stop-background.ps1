$ErrorActionPreference = "Continue"

$listeners = Get-NetTCPConnection -LocalPort 3747 -State Listen -ErrorAction SilentlyContinue
if (-not $listeners) {
  Write-Host "No PlexApp listener found on port 3747."
  exit 0
}

foreach ($listener in $listeners) {
  $process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
  if ($process) {
    Write-Host "Stopping process $($process.ProcessName) ($($process.Id))..."
    Stop-Process -Id $process.Id -Force
  }
}

Write-Host "Stopped PlexApp listener on port 3747."
