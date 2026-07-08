$ErrorActionPreference = 'SilentlyContinue'

foreach ($port in 8081, 8082, 8085) {
  Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

Get-Process node -ErrorAction SilentlyContinue |
  Where-Object { $_.Path -notlike '*cursor*' } |
  Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host 'Stopped Expo Metro on ports 8081, 8082, 8085.' -ForegroundColor Green
Write-Host 'Now run: npm run mobile' -ForegroundColor Cyan
