import { join } from 'path';

export default () => ({
  // Application
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appHost: process.env.APP_HOST || 'http://localhost:5001',

  // Database
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: String(process.env.DB_PASSWORD ?? ''),
    name: process.env.DB_NAME || 'postgres',
    ssl: process.env.DATABASE_SSL === 'true',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.APP_HOST || 'http://localhost:5001'}/auth/google/callback`,
  },

  // Email
  email: {
    host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
    port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10),
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    password: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD,
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || 'noreply@icslearning.com',
  },

  // Payment - VNPay
  vnpay: {
    tmnCode: process.env.VNPAY_TMN_CODE,
    hashSecret: process.env.VNPAY_HASH_SECRET,
    url: process.env.VNPAY_URL,
    returnUrl: process.env.VNPAY_RETURN_URL,
    ipnUrl: process.env.VNPAY_IPN_URL,
  },

  // Payment - Momo
  momo: {
    partnerCode: process.env.MOMO_PARTNER_CODE,
    accessKey: process.env.MOMO_ACCESS_KEY,
    secretKey: process.env.MOMO_SECRET_KEY,
    endpoint: process.env.MOMO_ENDPOINT,
    redirectUrl: process.env.MOMO_REDIRECT_URL,
    ipnUrl: process.env.MOMO_IPN_URL,
  },

  // Upload
  upload: {
    rootPath: process.env.UPLOAD_ROOT || join(process.cwd(), 'uploads'),
    baseUrl: process.env.APP_HOST || process.env.BASE_URL || 'http://localhost:5001',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedVideoTypes: ['video/mp4', 'video/webm', 'video/ogg'],
  },
});
