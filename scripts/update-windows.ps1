$ErrorActionPreference = "Stop"

Write-Host "Pulling latest changes from GitHub..."
git pull

Write-Host "Installing/updating Node dependencies..."
npm install

Write-Host ""
Write-Host "Update complete. Restart PlexApp if it is already running."
