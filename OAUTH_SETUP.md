# OAuth Setup Guide - Hướng Dẫn Cấu Hình OAuth

## 📋 Tổng Quan

Hệ thống yêu cầu **Google OAuth** để đăng nhập. Tài liệu này hướng dẫn thiết lập cho cả **localhost** và **production**.

**Vấn đề phổ biến:** Google OAuth chỉ chấp nhận callback URLs **không phải private IP**. 
- ❌ `http://192.168.1.10:5001/auth/google/callback` → **Bị block**
- ✅ `http://localhost:5001/auth/google/callback` → **Được accept**
- ✅ `https://your-domain.com/auth/google/callback` → **Được accept**

---

## 🔧 Setup Backend (NestJS)

### 1️⃣ Tạo .env file

```bash
cd ics-elearning-backend
cp .env.example .env.local
```

Sửa file `.env.local`:

```env
# Development - Localhost (Recommended)
NODE_ENV=development
PORT=5001
APP_HOST=http://localhost:5001
FRONTEND_URL=http://localhost:3000

# Google OAuth credentials
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Database & other configs...
```

### 2️⃣ Tạo Google OAuth Credentials

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project: `ICS E-Learning`
3. Bật API: `Google+ API`
4. Vào **Credentials** → **Create OAuth 2.0 Client ID**
5. Chọn **Web application**
6. **Authorized redirect URIs** - Thêm ALL các URL dưới đây:
   ```
   http://localhost:5001/auth/google/callback
   http://127.0.0.1:5001/auth/google/callback
   https://your-domain.com/auth/google/callback
   
   # Nếu testing qua ngrok:
   https://abc123.ngrok.io/auth/google/callback
   ```
7. Copy **Client ID** và **Client Secret** vào `.env.local`

### 3️⃣ Chạy Backend

```bash
npm install
npm run start:dev
```

Backend sẽ chạy tại: `http://localhost:5001`

---

## 🔧 Setup Frontend (Next.js)

### 1️⃣ Tạo .env.local

```bash
cd ics-elearning
cp .env.example .env.local
```

Sửa file `.env.local`:

```env
# Development - Localhost
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_BACKEND_URL=http://localhost:5001
```

### 2️⃣ Chạy Frontend

```bash
npm install
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:3000`

---

## 🌐 Thử nghiệm trên Máy Khác (Network Testing)

### ❌ Không thể dùng Private IP thực tiếp:

```bash
# KHÔNG HOẠT ĐỘNG:
# http://192.168.1.10:3000  ← Google OAuth bị block
```

### ✅ Giải pháp 1: Dùng ngrok (Recommended)

**Step 1: Install ngrok**
```bash
npm install -g ngrok
# hoặc download từ: https://ngrok.com/download
```

**Step 2: Tunnel backend**
```bash
# Terminal 1 - Backend
cd ics-elearning-backend
npm run start:dev  # chạy tại localhost:5001

# Terminal 2 - ngrok tunnel
ngrok http 5001
# Output: https://abc123.ngrok.io ← Copy URL này
```

**Step 3: Update Google OAuth**

Vào [Google Cloud Console](https://console.cloud.google.com/):
- **Credentials** → OAuth Client ID
- **Authorized redirect URIs** - Thêm:
  ```
  https://abc123.ngrok.io/auth/google/callback
  ```

**Step 4: Update Frontend .env**
```bash
# Terminal 3 - Frontend .env.local
NEXT_PUBLIC_API_URL=https://abc123.ngrok.io
NEXT_PUBLIC_BACKEND_URL=https://abc123.ngrok.io
```

**Step 5: Start Frontend**
```bash
npm run dev  # chạy tại localhost:3000
```

**Truy cập:** `http://localhost:3000` → OAuth sẽ route qua ngrok → Backend

---

### ✅ Giải pháp 2: Dùng /etc/hosts (Tùy chọn)

1. Edit file hosts:
   ```bash
   # Windows: C:\Windows\System32\drivers\etc\hosts
   # Mac/Linux: /etc/hosts
   
   # Thêm dòng:
   127.0.0.1    localhost.local
   192.168.1.10 dev.local
   ```

2. Update Google OAuth - Thêm redirect URI:
   ```
   http://dev.local:5001/auth/google/callback
   ```

3. Update .env:
   ```env
   APP_HOST=http://dev.local:5001
   NEXT_PUBLIC_API_URL=http://dev.local:5001
   ```

---

## 📍 Environment Variables Summary

| Variable | Purpose | Example |
|----------|---------|---------|
| `APP_HOST` | Backend URL | `http://localhost:5001` |
| `FRONTEND_URL` | Frontend URL | `http://localhost:3000` |
| `NODE_ENV` | Environment | `development` \| `production` |
| `GOOGLE_CLIENT_ID` | OAuth Client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth Secret | `xxxxx` |
| `NEXT_PUBLIC_API_URL` | Frontend → Backend | `http://localhost:5001` |

---

## 🚀 Production Setup

### Backend (.env)

```env
NODE_ENV=production
PORT=5001
APP_HOST=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

GOOGLE_CLIENT_ID=prod-client-id
GOOGLE_CLIENT_SECRET=prod-secret

DATABASE_URL=postgresql://prod-user:prod-pass@prod-host/ics_prod
DATABASE_SSL=true

JWT_SECRET=very-secure-random-key
```

### Frontend (.env.production)

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
```

### Google OAuth - Production Redirect URIs

```
https://api.yourdomain.com/auth/google/callback
https://yourdomain.com/callback  (if on same domain)
```

---

## 🧪 Troubleshooting

### ❌ "Error 400: invalid_request - device_id and device_name are required"

**Nguyên nhân:** Callback URL trong Google Cloud Console không khớp với thực tế

**Fix:**
```bash
# Kiểm tra:
1. APP_HOST trong backend .env
2. NEXT_PUBLIC_API_URL trong frontend .env
3. Authorized redirect URIs trong Google Cloud Console
   - Tất cả phải KHỚP CHÍNH XÁC
```

### ❌ "Error 400: invalid_request" trên Private IP

**Nguyên nhân:** Google không allow private IP

**Fix:** Dùng ngrok (step trên)

### ✅ "Sign in with Google" hoạt động?

Test bằng:
```bash
1. Truy cập http://localhost:3000
2. Click "Sign in with Google"
3. Chọn account Google
4. Kiểm tra console backend → có log từ OAuth callback không?
```

---

## 📝 Checklist Deployment

- [ ] Backend .env: `APP_HOST`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- [ ] Frontend .env: `NEXT_PUBLIC_API_URL` trỏ đúng
- [ ] Google Cloud Console: Thêm tất cả redirect URIs
- [ ] Backend chạy: `npm run start:dev`
- [ ] Frontend chạy: `npm run dev`
- [ ] Test OAuth: Klik "Sign in with Google"
- [ ] Check browser console → không có CORS error?
- [ ] Check backend logs → có log callback từ Google?

---

## 📞 Liên hệ & Debug

Nếu vẫn lỗi:

```bash
# 1. Check backend logs
npm run start:dev 2>&1 | grep -i "google\|oauth\|callback"

# 2. Check frontend logs
F12 → Console → filter "auth", "google"

# 3. Verify URLs match
echo "Backend: $APP_HOST"
echo "Frontend API: $NEXT_PUBLIC_API_URL"
echo "Google OAuth: Check console.cloud.google.com"
```

---

**Version:** 1.0  
**Last Updated:** March 25, 2026
