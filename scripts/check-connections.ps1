$ErrorActionPreference = "Continue"

Write-Host "Checking qBittorrent Web UI on localhost..."
try {
  $qb = Invoke-WebRequest "http://127.0.0.1:8080" -UseBasicParsing -TimeoutSec 5
  Write-Host "qBittorrent reachable: HTTP $($qb.StatusCode)"
} catch {
  Write-Host "qBittorrent not reachable at http://127.0.0.1:8080"
  Write-Host "Enable qBittorrent Web UI or update QBITTORRENT_URL in .env if you used a different port."
}

Write-Host ""
Write-Host "Checking Plex server..."
try {
  $plex = Invoke-WebRequest "http://192.168.1.200:32400/identity" -UseBasicParsing -TimeoutSec 5
  Write-Host "Plex reachable: HTTP $($plex.StatusCode)"
} catch {
  Write-Host "Plex not reachable at http://192.168.1.200:32400"
  Write-Host "Check the Plex server IP, port, and firewall."
}

Write-Host ""
Write-Host "Checking PlexApp local port..."
try {
  $app = Invoke-WebRequest "http://127.0.0.1:3747/api/config" -UseBasicParsing -TimeoutSec 5
  Write-Host "PlexApp reachable: HTTP $($app.StatusCode)"
} catch {
  Write-Host "PlexApp is not running yet. Start it with: npm start"
}
