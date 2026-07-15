$ErrorActionPreference = "Continue"

Write-Host "PlexApp listener status:"
$listeners = Get-NetTCPConnection -LocalPort 3747 -State Listen -ErrorAction SilentlyContinue
if ($listeners) {
  $listeners | Format-Table LocalAddress,LocalPort,State,OwningProcess -AutoSize
  foreach ($listener in $listeners) {
    Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue | Format-Table Id,ProcessName,Path -AutoSize
  }
} else {
  Write-Host "Not running. No process is listening on TCP 3747."
}

Write-Host ""
Write-Host "Local HTTP check:"
try {
  $app = Invoke-WebRequest "http://127.0.0.1:3747/api/config" -UseBasicParsing -TimeoutSec 5
  Write-Host "OK: HTTP $($app.StatusCode)"
} catch {
  Write-Host "Failed: $($_.Exception.Message)"
}
