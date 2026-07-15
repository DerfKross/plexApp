$ErrorActionPreference = "Stop"

$envPath = ".env"
$examplePath = ".env.example"

if (-not (Test-Path $examplePath)) {
  Write-Host ".env.example is missing."
  exit 1
}

if (-not (Test-Path $envPath)) {
  Write-Host ".env is missing. Creating it from .env.example..."
  Copy-Item $examplePath $envPath
  exit 0
}

$envContent = Get-Content $envPath
$exampleContent = Get-Content $examplePath

$existingKeys = @{}
foreach ($line in $envContent) {
  if ($line -match "^\s*([A-Za-z_][A-Za-z0-9_]*)=") {
    $existingKeys[$matches[1]] = $true
  }
}

$missingLines = New-Object System.Collections.Generic.List[string]
foreach ($line in $exampleContent) {
  if ($line -match "^\s*([A-Za-z_][A-Za-z0-9_]*)=") {
    $key = $matches[1]
    if (-not $existingKeys.ContainsKey($key)) {
      if ($missingLines.Count -eq 0) {
        $missingLines.Add("")
        $missingLines.Add("# Added by scripts/sync-env.ps1")
      }
      $missingLines.Add($line)
    }
  }
}

if ($missingLines.Count -eq 0) {
  Write-Host ".env already has all known options."
  exit 0
}

Add-Content -Path $envPath -Value $missingLines
Write-Host "Added missing .env options:"
$missingLines | Where-Object { $_ -match "^\s*[A-Za-z_][A-Za-z0-9_]*=" } | ForEach-Object {
  Write-Host "  $_"
}
