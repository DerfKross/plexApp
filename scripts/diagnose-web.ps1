$ErrorActionPreference = "Continue"

Write-Host "PlexApp .env network settings:"
if (Test-Path ".env") {
  Select-String -Path ".env" -Pattern "^(HOST|PORT)="
} else {
  Write-Host ".env is missing."
}

Write-Host ""
Write-Host "Checking for a listener on TCP 3747..."
$listeners = Get-NetTCPConnection -LocalPort 3747 -State Listen -ErrorAction SilentlyContinue
if ($listeners) {
  $listeners | Format-Table LocalAddress,LocalPort,State,OwningProcess -AutoSize
  foreach ($listener in $listeners) {
    Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue | Format-Table Id,ProcessName,Path -AutoSize
  }
} else {
  Write-Host "No process is listening on TCP 3747."
}

Write-Host ""
Write-Host "Testing local app endpoint..."
try {
  $app = Invoke-WebRequest "http://127.0.0.1:3747/api/config" -UseBasicParsing -TimeoutSec 5
  Write-Host "Local PlexApp HTTP status: $($app.StatusCode)"
} catch {
  Write-Host "Local PlexApp test failed: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "Firewall rules for PlexApp:"
Get-NetFirewallRule -DisplayName "PlexApp Web GUI 3747" -ErrorAction SilentlyContinue |
  Get-NetFirewallPortFilter |
  Format-Table Protocol,LocalPort,RemotePort -AutoSize
