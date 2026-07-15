$ErrorActionPreference = "Stop"

Write-Host "Checking Git..."
git --version

Write-Host "Checking Node.js..."
node --version

Write-Host "Checking npm..."
npm --version

if (-not (Test-Path ".env")) {
  Write-Host "Creating .env from .env.example..."
  Copy-Item ".env.example" ".env"
} else {
  Write-Host ".env already exists; leaving it unchanged."
}

Write-Host "Installing Node dependencies..."
npm install

Write-Host ""
Write-Host "Setup complete."
Write-Host "Next: edit .env with your qBittorrent password, Plex token, library IDs, and media paths."
Write-Host "Then run: .\scripts\start-windows.ps1"
