param(
  [ValidateSet('lan', 'tunnel', 'usb')]
  [string]$Mode = 'lan'
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

function Stop-PortListeners {
  param([int[]]$Ports)

  foreach ($port in $Ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
      $pid = $conn.OwningProcess
      if ($pid -and $pid -gt 0) {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
      }
    }
  }

  Get-Process node -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -notlike '*cursor*' } |
    Stop-Process -Force -ErrorAction SilentlyContinue

  Start-Sleep -Seconds 2
}

function Test-PortListening {
  param([int]$Port)
  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Get-LanIp {
  $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike '127.*' -and
      $_.IPAddress -notlike '169.254.*' -and
      $_.PrefixOrigin -ne 'WellKnown'
    } |
    Sort-Object InterfaceMetric |
    Select-Object -First 1 -ExpandProperty IPAddress

  if (-not $ip) {
    throw 'Could not detect LAN IP. Connect to Wi-Fi or hotspot first.'
  }
  return $ip
}

function Show-ConnectHelp {
  param([string]$Url)

  Write-Host ''
  Write-Host '=== Connect in Expo Go ===' -ForegroundColor Cyan
  Write-Host "URL: $Url" -ForegroundColor Green
  Write-Host ''
  Write-Host 'If you see "Failed to download remote update":' -ForegroundColor Yellow
  Write-Host '  1. Keep this terminal OPEN while using the app' -ForegroundColor Yellow
  Write-Host '  2. Expo Go -> Projects -> pull down -> Clear cache' -ForegroundColor Yellow
  Write-Host '  3. Enter the URL above manually (do not use an old QR)' -ForegroundColor Yellow
  Write-Host '  4. Phone + PC must be on the SAME Wi-Fi' -ForegroundColor Yellow
  Write-Host '  5. Run as Admin once: npm run mobile:firewall' -ForegroundColor Yellow
  Write-Host '  6. Update Expo Go from Play Store (needs SDK 54)' -ForegroundColor Yellow
  Write-Host '  7. Or try USB: npm run mobile:usb' -ForegroundColor Yellow
  Write-Host ''
}

Stop-PortListeners -Ports @(8081, 8082, 8085)

if (Test-PortListening -Port 8081) {
  Write-Host 'Port 8081 is still in use. Close other Metro/Expo windows and run again.' -ForegroundColor Red
  Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue } |
    Select-Object Id, ProcessName, Path
  exit 1
}

$env:EXPO_NO_DOTENV = '1'

switch ($Mode) {
  'lan' {
    $ip = Get-LanIp
    $env:REACT_NATIVE_PACKAGER_HOSTNAME = $ip
    $url = "exp://$ip`:8081"
    Show-ConnectHelp -Url $url
    npx expo start --lan --clear --port 8081
  }
  'tunnel' {
    Remove-Item Env:REACT_NATIVE_PACKAGER_HOSTNAME -ErrorAction SilentlyContinue
    Write-Host ''
    Write-Host '=== Expo TUNNEL mode ===' -ForegroundColor Cyan
    Write-Host 'Wait for the exp:// URL in the terminal, then scan that QR code.' -ForegroundColor Yellow
    Show-ConnectHelp -Url '(shown below when tunnel is ready)'
    Write-Host ''
    npx expo start --tunnel --clear --port 8081
    if ($LASTEXITCODE -ne 0) {
      Write-Host ''
      Write-Host 'Tunnel failed. Try LAN: npm run mobile' -ForegroundColor Red
      Write-Host 'Or USB: npm run mobile:usb' -ForegroundColor Yellow
    }
  }
  'usb' {
    $adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
    if (-not (Test-Path $adb)) {
      throw "adb not found at $adb. Install Android SDK platform-tools or use -Mode tunnel."
    }

    $devices = & $adb devices | Select-String 'device$'
    if (-not $devices) {
      Write-Host 'No Android device detected.' -ForegroundColor Red
      Write-Host '1. Enable Developer options + USB debugging on phone' -ForegroundColor Yellow
      Write-Host '2. Connect phone with USB cable' -ForegroundColor Yellow
      Write-Host '3. Accept the USB debugging prompt on phone' -ForegroundColor Yellow
      throw 'Connect your phone via USB and run this script again.'
    }

    & $adb reverse tcp:8081 tcp:8081 | Out-Null
    Remove-Item Env:REACT_NATIVE_PACKAGER_HOSTNAME -ErrorAction SilentlyContinue

    Show-ConnectHelp -Url 'exp://127.0.0.1:8081'
    npx expo start --localhost --clear --port 8081
  }
}
