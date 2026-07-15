$ErrorActionPreference = "Stop"

$ruleName = "PlexApp Web GUI 3747"

$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Replacing existing firewall rule: $ruleName"
  Remove-NetFirewallRule -DisplayName $ruleName
}

New-NetFirewallRule `
  -DisplayName $ruleName `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort 3747 `
  -RemoteAddress LocalSubnet `
  -Profile Any

Write-Host "Added Windows Firewall rule for TCP port 3747 from local subnet devices."
Write-Host "Try opening: http://192.168.1.131:3747"
