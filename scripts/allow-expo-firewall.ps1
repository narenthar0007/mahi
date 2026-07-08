# Allow Expo Metro (port 8081) and Node.js through Windows Firewall.
# Run once as Administrator: npm run mobile:firewall

$ErrorActionPreference = 'Stop'

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
  )) {
  Write-Host 'Re-run PowerShell as Administrator, then:' -ForegroundColor Yellow
  Write-Host '  npm run mobile:firewall' -ForegroundColor Cyan
  exit 1
}

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
$nodeExe = if ($nodeCmd) { $nodeCmd.Source } else { $null }
$rules = @(
  @{
    Name = 'GEET Expo Metro TCP 8081'
    Params = @{
      DisplayName = 'GEET Expo Metro TCP 8081'
      Direction   = 'Inbound'
      Action      = 'Allow'
      Protocol    = 'TCP'
      LocalPort   = 8081
      Profile     = 'Private', 'Public'
    }
  }
)

if ($nodeExe) {
  $rules += @{
    Name = 'GEET Expo Node.js'
    Params = @{
      DisplayName = 'GEET Expo Node.js'
      Direction   = 'Inbound'
      Action      = 'Allow'
      Program     = $nodeExe
      Profile     = 'Private', 'Public'
    }
  }
}

foreach ($rule in $rules) {
  $existing = Get-NetFirewallRule -DisplayName $rule.Params.DisplayName -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "Already allowed: $($rule.Params.DisplayName)" -ForegroundColor Green
    continue
  }
  New-NetFirewallRule @rule.Params | Out-Null
  Write-Host "Added firewall rule: $($rule.Params.DisplayName)" -ForegroundColor Green
}

Write-Host ''
Write-Host 'Firewall updated. Now run: npm run mobile' -ForegroundColor Cyan
