$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$mysql = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe"
$mysqlConfig = "C:\ProgramData\MySQL\FlowApp-my.ini"
$backendHealth = "http://localhost:5001/api-v1/system/health"
$frontendUrl = "http://localhost:3000"

function Test-Url([string]$Url) {
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
    }
    catch { return $false }
}

function Wait-ForUrl([string]$Url, [string]$Name, [int]$Attempts = 60) {
    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        if (Test-Url $Url) { return }
        Start-Sleep -Seconds 1
    }
    throw "$Name se nije uspio pokrenuti. Provjerite terminal ili logove aplikacije."
}

if (-not (Get-Process mysqld -ErrorAction SilentlyContinue)) {
    Start-Process -FilePath $mysql -ArgumentList "--defaults-file=$mysqlConfig" -WindowStyle Hidden
    Start-Sleep -Seconds 3
}

if (-not (Test-Url $backendHealth)) {
    Start-Process -FilePath "npm.cmd" -ArgumentList "run start:prod" -WorkingDirectory (Join-Path $root "backend") -WindowStyle Hidden
}
Wait-ForUrl $backendHealth "Backend API" 30

if (-not (Test-Url $frontendUrl)) {
    Start-Process -FilePath "npm.cmd" -ArgumentList "start" -WorkingDirectory (Join-Path $root "frontend") -WindowStyle Hidden
}
Wait-ForUrl $frontendUrl "Frontend" 180

Write-Host "Flow App je spreman: $frontendUrl"
Write-Host "MySQL API radi: $backendHealth"
