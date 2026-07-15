$ErrorActionPreference = "Stop"

$ruleName = "PlexApp Web GUI 3747"

$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Firewall rule already exists: $ruleName"
  exit 0
}

New-NetFirewallRule `
  -DisplayName $ruleName `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort 3747 `
  -Profile Private

Write-Host "Added Windows Firewall rule for TCP port 3747 on Private networks."
Write-Host "Try opening: http://192.168.1.131:3747"
