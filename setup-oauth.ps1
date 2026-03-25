# Windows PowerShell Setup Script for OAuth Configuration
# Usage: .\setup-oauth.ps1

param(
    [string]$Environment = "development"
)

Write-Host "🚀 ICS E-Learning OAuth Setup" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

if ($Environment -eq "development") {
    Write-Host "📝 Development Setup (Localhost)" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host ""
    
    $backendHost = Read-Host "Backend host [http://localhost:5001]"
    if ([string]::IsNullOrWhitespace($backendHost)) { $backendHost = "http://localhost:5001" }
    
    $frontendHost = Read-Host "Frontend host [http://localhost:3000]"
    if ([string]::IsNullOrWhitespace($frontendHost)) { $frontendHost = "http://localhost:3000" }
    
    $googleClientId = Read-Host "Google Client ID"
    if ([string]::IsNullOrWhitespace($googleClientId)) {
        Write-Host "❌ Google Client ID is required" -ForegroundColor Red
        exit 1
    }
    
    $googleClientSecret = Read-Host "Google Client Secret" -AsSecureString
    $googleClientSecret = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($googleClientSecret))
    
    if ([string]::IsNullOrWhitespace($googleClientSecret)) {
        Write-Host "❌ Google Client Secret is required" -ForegroundColor Red
        exit 1
    }
    
    # Create backend .env
    $backendEnv = @"
NODE_ENV=development
PORT=5001
APP_HOST=$backendHost
FRONTEND_URL=$frontendHost

GOOGLE_CLIENT_ID=$googleClientId
GOOGLE_CLIENT_SECRET=$googleClientSecret

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ics_elearning
DATABASE_SSL=false

JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=dev-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@icslearning.com

MAX_FILE_SIZE=10485760
"@

    Set-Content -Path "ics-elearning-backend\.env.local" -Value $backendEnv -Force
    Write-Host "✅ Created: ics-elearning-backend\.env.local" -ForegroundColor Green
    
    # Create frontend .env
    $frontendEnv = @"
NEXT_PUBLIC_API_URL=$backendHost
NEXT_PUBLIC_BACKEND_URL=$backendHost
"@

    Set-Content -Path "ics-elearning\.env.local" -Value $frontendEnv -Force
    Write-Host "✅ Created: ics-elearning\.env.local" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "📍 Google OAuth - Add Redirect URI:" -ForegroundColor Yellow
    Write-Host "   1. Go to: https://console.cloud.google.com/" -ForegroundColor Yellow
    Write-Host "   2. Select your OAuth 2.0 Client ID" -ForegroundColor Yellow
    Write-Host "   3. Add to 'Authorized redirect URIs':" -ForegroundColor Yellow
    Write-Host "      ➜ $backendHost/auth/google/callback" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "🚀 To start servers:" -ForegroundColor Cyan
    Write-Host "   Backend:  cd ics-elearning-backend && npm run start:dev" -ForegroundColor White
    Write-Host "   Frontend: cd ics-elearning && npm run dev" -ForegroundColor White
    Write-Host ""
    
} elseif ($Environment -eq "production") {
    Write-Host "📝 Production Setup" -ForegroundColor Green
    Write-Host "===================" -ForegroundColor Green
    Write-Host ""
    
    $backendDomain = Read-Host "Backend domain (e.g., api.yourdomain.com)"
    $frontendDomain = Read-Host "Frontend domain (e.g., yourdomain.com)"
    $databaseUrl = Read-Host "Database URL"
    $googleClientId = Read-Host "Google Client ID"
    
    $googleClientSecret = Read-Host "Google Client Secret" -AsSecureString
    $googleClientSecret = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($googleClientSecret))
    
    # Generate random JWT secrets
    $jwtSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Minimum 0 -Maximum 256) }))
    $refreshSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Minimum 0 -Maximum 256) }))
    
    # Create backend .env
    $backendEnv = @"
NODE_ENV=production
PORT=5001
APP_HOST=https://$backendDomain
FRONTEND_URL=https://$frontendDomain

GOOGLE_CLIENT_ID=$googleClientId
GOOGLE_CLIENT_SECRET=$googleClientSecret

DATABASE_URL=$databaseUrl
DATABASE_SSL=true

JWT_SECRET=$jwtSecret
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=$refreshSecret
JWT_REFRESH_EXPIRES_IN=30d

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@icslearning.com

MAX_FILE_SIZE=10485760
"@

    Set-Content -Path "ics-elearning-backend\.env.production" -Value $backendEnv -Force
    Write-Host "✅ Created: ics-elearning-backend\.env.production" -ForegroundColor Green
    
    # Create frontend .env
    $frontendEnv = @"
NEXT_PUBLIC_API_URL=https://$backendDomain
NEXT_PUBLIC_BACKEND_URL=https://$backendDomain
"@

    Set-Content -Path "ics-elearning\.env.production" -Value $frontendEnv -Force
    Write-Host "✅ Created: ics-elearning\.env.production" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "⚠️  IMPORTANT - Add Redirect URI to Google OAuth:" -ForegroundColor Yellow
    Write-Host "   https://$backendDomain/auth/google/callback" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔐 JWT secrets have been generated automatically" -ForegroundColor Green
    Write-Host ""
}

Write-Host "✨ Setup complete!" -ForegroundColor Cyan
