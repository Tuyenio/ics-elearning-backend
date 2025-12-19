# PowerShell script to kill process on port 5000
$port = 5000
Write-Host "Finding process using port $port..." -ForegroundColor Yellow

$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if ($connections) {
    foreach ($conn in $connections) {
        $processId = $conn.OwningProcess
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue

        if ($process) {
            Write-Host "Found process: $($process.ProcessName) (PID: $processId)" -ForegroundColor Cyan
            Write-Host "Killing process..." -ForegroundColor Red
            Stop-Process -Id $processId -Force
            Write-Host "Process killed successfully!" -ForegroundColor Green
        }
    }
} else {
    Write-Host "No process found using port $port" -ForegroundColor Green
}

Write-Host "`nYou can now start your backend server with: pnpm run start" -ForegroundColor Yellow

