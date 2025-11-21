# ICS Learning Backend - Authentication API

Backend cho hệ thống ICS Learning được xây dựng với NestJS, TypeORM, và PostgreSQL.

## Cài đặt và Chạy

### Prerequisites
- Node.js 18+
- PostgreSQL (hoặc Supabase)
- npm/yarn

### Cài đặt
```bash
cd ics-elearning-backend
npm install
```

### Environment Variables
Tạo file `.env` trong thư mục root:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Application
PORT=5000
FRONTEND_URL=http://localhost:3000

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="ICS Learning" <your-email@gmail.com>
```

### Chạy ứng dụng
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Endpoints

### Authentication

#### POST /auth/register
Đăng ký tài khoản mới

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Nguyễn Văn A",
  "phone": "0123456789",
  "role": "STUDENT"
}
```

**Response:**
```json
{
  "message": "User registered successfully. Please check your email for verification.",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Nguyễn Văn A",
    "role": "STUDENT",
    "status": "PENDING"
  }
}
```

#### POST /auth/login
Đăng nhập

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Nguyễn Văn A",
    "role": "STUDENT",
    "avatar": null
  }
}
```

#### GET /auth/verify-email?token=verification-token
Xác thực email

**Response:**
```json
{
  "message": "Email verified successfully"
}
```

#### POST /auth/forgot-password
Quên mật khẩu

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If the email exists, a reset link will be sent."
}
```

#### POST /auth/reset-password
Đặt lại mật khẩu

**Request Body:**
```json
{
  "token": "reset-token",
  "password": "newpassword123"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

#### GET /auth/profile
Lấy thông tin profile (yêu cầu JWT token)

**Headers:**
```
Authorization: Bearer jwt-token
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "STUDENT"
}
```

#### POST /auth/refresh
Làm mới JWT token (yêu cầu JWT token)

**Headers:**
```
Authorization: Bearer jwt-token
```

**Response:**
```json
{
  "access_token": "new-jwt-token"
}
```

#### POST /auth/logout
Đăng xuất (yêu cầu JWT token)

**Headers:**
```
Authorization: Bearer jwt-token
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### Users

#### GET /users
Lấy danh sách users (yêu cầu ADMIN role)

#### GET /users/:id
Lấy thông tin user theo ID

#### PUT /users/:id
Cập nhật thông tin user

#### DELETE /users/:id
Xóa user (yêu cầu ADMIN role)

## Database Schema

### User Entity
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  phone VARCHAR,
  avatar VARCHAR,
  role user_role DEFAULT 'STUDENT',
  status user_status DEFAULT 'PENDING',
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR,
  password_reset_token VARCHAR,
  password_reset_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Enums
```sql
CREATE TYPE user_role AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'BANNED', 'PENDING');
```

## Authentication Flow

1. **Đăng ký:** User gửi thông tin → Server tạo account với status PENDING → Gửi email xác thực
2. **Xác thực email:** User click link trong email → Server verify token → Cập nhật status thành ACTIVE → Gửi welcome email
3. **Đăng nhập:** User gửi email/password → Server verify → Trả về JWT token
4. **Truy cập protected routes:** Client gửi JWT token trong header → Server verify → Cho phép truy cập
5. **Quên mật khẩu:** User gửi email → Server gửi reset link → User click link → Nhập password mới

## Security Features

- Password hashing với bcrypt
- JWT tokens với expiration
- Email verification required
- Role-based access control (RBAC)
- Input validation với class-validator
- CORS protection
- Rate limiting (có thể thêm)

## Email Templates

Hệ thống gửi 3 loại email:
1. **Email xác thực:** Gửi khi user đăng ký
2. **Welcome email:** Gửi khi user xác thực thành công
3. **Password reset:** Gửi khi user yêu cầu đặt lại mật khẩu

## Error Handling

API trả về consistent error format:
```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 500: Internal Server Error