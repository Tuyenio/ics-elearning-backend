export const APP_CONSTANTS = {
  // Pagination
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,

  // File Upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],

  // Date Formats
  DATE_FORMAT: 'YYYY-MM-DD',
  DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',
  TIME_FORMAT: 'HH:mm:ss',

  // Cache TTL (seconds)
  CACHE_TTL_SHORT: 60, // 1 minute
  CACHE_TTL_MEDIUM: 300, // 5 minutes
  CACHE_TTL_LONG: 3600, // 1 hour
  CACHE_TTL_DAY: 86400, // 24 hours

  // Rate Limiting
  RATE_LIMIT_TTL: 60, // 1 minute
  RATE_LIMIT_MAX: 100, // 100 requests per TTL

  // Password
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,

  // OTP/2FA
  OTP_LENGTH: 6,
  OTP_EXPIRY: 300, // 5 minutes (in seconds)
  BACKUP_CODES_COUNT: 10,

  // Certificate
  CERTIFICATE_VALIDITY_DAYS: 3650, // 10 years

  // Payment
  PAYMENT_TIMEOUT: 900, // 15 minutes (in seconds)

  // Course
  MAX_COURSE_TITLE_LENGTH: 200,
  MAX_COURSE_DESCRIPTION_LENGTH: 5000,
  MIN_COURSE_PRICE: 0,
  MAX_COURSE_PRICE: 100000000,

  // Review
  MIN_RATING: 1,
  MAX_RATING: 5,

  // Quiz/Exam
  MIN_PASS_SCORE: 0,
  MAX_PASS_SCORE: 100,
  DEFAULT_PASS_SCORE: 70,
  MAX_QUIZ_ATTEMPTS: 3,
  MAX_EXAM_ATTEMPTS: 2,
} as const;

export const HTTP_STATUS_MESSAGES = {
  200: 'Success',
  201: 'Created',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  500: 'Internal Server Error',
} as const;

export const ERROR_CODES = {
  // Authentication & Authorization
  AUTH_INVALID_CREDENTIALS: 'AUTH_001',
  AUTH_TOKEN_EXPIRED: 'AUTH_002',
  AUTH_TOKEN_INVALID: 'AUTH_003',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_004',
  AUTH_2FA_REQUIRED: 'AUTH_005',
  AUTH_2FA_INVALID: 'AUTH_006',

  // User
  USER_NOT_FOUND: 'USER_001',
  USER_ALREADY_EXISTS: 'USER_002',
  USER_INACTIVE: 'USER_003',
  USER_EMAIL_NOT_VERIFIED: 'USER_004',

  // Course
  COURSE_NOT_FOUND: 'COURSE_001',
  COURSE_ALREADY_ENROLLED: 'COURSE_002',
  COURSE_NOT_PUBLISHED: 'COURSE_003',

  // Enrollment
  ENROLLMENT_NOT_FOUND: 'ENROLL_001',
  ENROLLMENT_ALREADY_EXISTS: 'ENROLL_002',
  ENROLLMENT_EXPIRED: 'ENROLL_003',

  // Payment
  PAYMENT_FAILED: 'PAY_001',
  PAYMENT_INVALID: 'PAY_002',
  PAYMENT_DUPLICATE: 'PAY_003',
  PAYMENT_EXPIRED: 'PAY_004',

  // Quiz/Exam
  QUIZ_NOT_FOUND: 'QUIZ_001',
  QUIZ_MAX_ATTEMPTS_REACHED: 'QUIZ_002',
  EXAM_NOT_FOUND: 'EXAM_001',
  EXAM_NOT_AVAILABLE: 'EXAM_002',
  EXAM_MAX_ATTEMPTS_REACHED: 'EXAM_003',

  // Certificate
  CERTIFICATE_NOT_FOUND: 'CERT_001',
  CERTIFICATE_NOT_ELIGIBLE: 'CERT_002',

  // Validation
  VALIDATION_ERROR: 'VAL_001',
  INVALID_FILE_TYPE: 'VAL_002',
  FILE_TOO_LARGE: 'VAL_003',

  // General
  RESOURCE_NOT_FOUND: 'GEN_001',
  OPERATION_FAILED: 'GEN_002',
  INTERNAL_ERROR: 'GEN_003',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
