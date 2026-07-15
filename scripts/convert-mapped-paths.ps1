$ErrorActionPreference = "Stop"

$envPath = ".env"
$pathKeys = @("MOVIE_SAVE_PATH", "TV_SAVE_PATH")

if (-not (Test-Path $envPath)) {
  Write-Host ".env is missing. Run .\scripts\setup-windows.ps1 first."
  exit 1
}

function Convert-MappedPathToUnc {
  param([string]$PathValue)

  if ($PathValue -notmatch "^([A-Za-z]):[\\/]*(.*)$") {
    return $PathValue
  }

  $driveLetter = $matches[1].ToUpper()
  $rest = $matches[2] -replace "/", "\"
  $deviceId = "${driveLetter}:"
  $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$deviceId'" -ErrorAction SilentlyContinue

  if (-not $disk -or -not $disk.ProviderName) {
    Write-Host "Could not resolve $deviceId to a UNC path. Is the drive mapped in this session?"
    return $PathValue
  }

  $uncRoot = $disk.ProviderName.TrimEnd("\")
  if ($rest) {
    return "$uncRoot\$rest"
  }
  return $uncRoot
}

$lines = Get-Content $envPath
$changed = $false
$updated = foreach ($line in $lines) {
  $matched = $false
  foreach ($key in $pathKeys) {
    if ($line -match "^$key=(.*)$") {
      $matched = $true
      $currentValue = $matches[1].Trim()
      $newValue = Convert-MappedPathToUnc $currentValue
      if ($newValue -ne $currentValue) {
        Write-Host "$key converted:"
        Write-Host "  from: $currentValue"
        Write-Host "  to:   $newValue"
        $changed = $true
      }
      "$key=$newValue"
      break
    }
  }

  if (-not $matched) {
    $line
  }
}

if ($changed) {
  Set-Content -Path $envPath -Value $updated
  Write-Host ""
  Write-Host ".env updated. Restart PlexApp for the change to take effect."
} else {
  Write-Host "No mapped media paths were converted."
}
