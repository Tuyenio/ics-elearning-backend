#!/bin/bash
# Setup script cho ICS E-Learning OAuth Configuration
# Usage: ./setup-oauth.sh

set -e

echo "🚀 ICS E-Learning OAuth Setup"
echo "=============================="
echo ""

# Check environment
if [ -z "$NODE_ENV" ]; then
    read -p "Environment (development/production) [development]: " ENV
    ENV=${ENV:-development}
else
    ENV=$NODE_ENV
fi

if [ "$ENV" == "development" ]; then
    echo ""
    echo "📝 Development Setup (Localhost)"
    echo "================================"
    
    read -p "Backend host [http://localhost:5001]: " BACKEND_HOST
    BACKEND_HOST=${BACKEND_HOST:-http://localhost:5001}
    
    read -p "Frontend host [http://localhost:3000]: " FRONTEND_HOST
    FRONTEND_HOST=${FRONTEND_HOST:-http://localhost:3000}
    
    read -p "Google Client ID: " GOOGLE_CLIENT_ID
    if [ -z "$GOOGLE_CLIENT_ID" ]; then
        echo "❌ Google Client ID is required"
        exit 1
    fi
    
    read -sp "Google Client Secret: " GOOGLE_CLIENT_SECRET
    echo ""
    if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
        echo "❌ Google Client Secret is required"
        exit 1
    fi
    
    # Create backend .env
    cat > ics-elearning-backend/.env.local << EOF
NODE_ENV=development
PORT=5001
APP_HOST=$BACKEND_HOST
FRONTEND_URL=$FRONTEND_HOST

GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET

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
EOF

    # Create frontend .env
    cat > ics-elearning/.env.local << EOF
NEXT_PUBLIC_API_URL=$BACKEND_HOST
NEXT_PUBLIC_BACKEND_URL=$BACKEND_HOST
EOF

    echo ""
    echo "✅ Configuration created!"
    echo ""
    echo "📍 Google OAuth - Add these Redirect URIs:"
    echo "   1. https://console.cloud.google.com/"
    echo "   2. Select your OAuth 2.0 Client ID"
    echo "   3. Add to 'Authorized redirect URIs':"
    echo "      ➜ $BACKEND_HOST/auth/google/callback"
    echo ""
    echo "🚀 To start servers:"
    echo "   Backend:  cd ics-elearning-backend && npm run start:dev"
    echo "   Frontend: cd ics-elearning && npm run dev"
    echo ""
    
elif [ "$ENV" == "production" ]; then
    echo ""
    echo "📝 Production Setup"
    echo "===================="
    
    read -p "Backend domain (e.g., api.yourdomain.com): " BACKEND_DOMAIN
    read -p "Frontend domain (e.g., yourdomain.com): " FRONTEND_DOMAIN
    read -p "Database URL: " DATABASE_URL
    read -p "Google Client ID: " GOOGLE_CLIENT_ID
    read -sp "Google Client Secret: " GOOGLE_CLIENT_SECRET
    echo ""
    
    # Create backend .env
    cat > ics-elearning-backend/.env.production << EOF
NODE_ENV=production
PORT=5001
APP_HOST=https://$BACKEND_DOMAIN
FRONTEND_URL=https://$FRONTEND_DOMAIN

GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET

DATABASE_URL=$DATABASE_URL
DATABASE_SSL=true

JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_EXPIRES_IN=30d

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@icslearning.com

MAX_FILE_SIZE=10485760
EOF

    # Create frontend .env
    cat > ics-elearning/.env.production << EOF
NEXT_PUBLIC_API_URL=https://$BACKEND_DOMAIN
NEXT_PUBLIC_BACKEND_URL=https://$BACKEND_DOMAIN
EOF

    echo ""
    echo "✅ Production configuration created!"
    echo ""
    echo "⚠️  IMPORTANT - Add these Redirect URIs to Google OAuth:"
    echo "   https://$BACKEND_DOMAIN/auth/google/callback"
    echo ""
    echo "🔐 JWT secrets have been generated automatically"
    echo ""
fi

echo "✨ Setup complete!"
