$ErrorActionPreference = "Stop"

Write-Host "Pulling latest changes from GitHub..."
git pull

Write-Host "Installing/updating Node dependencies..."
npm install

Write-Host "Syncing missing .env options..."
.\scripts\sync-env.ps1

Write-Host ""
Write-Host "Update complete. Restart PlexApp if it is already running."
