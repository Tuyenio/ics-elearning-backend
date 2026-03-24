import { Request } from 'express';

export type SupportedLanguage = 'vi' | 'en';

type DictionaryEntry = {
  vi: string;
  en: string;
};

const DICTIONARY: DictionaryEntry[] = [
  { vi: 'Loi he thong', en: 'Internal server error' },
  { vi: 'Khong tim thay', en: 'Resource not found' },
  { vi: 'Truy cap bi tu choi', en: 'Access denied' },
  { vi: 'Ban khong co quyen thuc hien thao tac nay', en: 'You do not have permission to perform this action' },
  { vi: 'Ban chi co the cap nhat du lieu cua ban', en: 'You can only update your own data' },
  { vi: 'Ban chi co the xoa du lieu cua ban', en: 'You can only delete your own data' },
  { vi: 'Khoa hoc khong tim thay', en: 'Course not found' },
  { vi: 'Nguoi dung khong tim thay', en: 'User not found' },
  { vi: 'Dang ky khong tim thay', en: 'Enrollment not found' },
  { vi: 'Bai hoc khong tim thay', en: 'Lesson not found' },
  { vi: 'Bai kiem tra khong tim thay', en: 'Quiz not found' },
  { vi: 'Khong tim thay de thi', en: 'Exam not found' },
  { vi: 'Chung chi khong tim thay', en: 'Certificate not found' },
  { vi: 'Danh muc voi ten hoac slug nay da ton tai', en: 'A category with this name or slug already exists' },
  { vi: 'Danh muc voi ten nay da ton tai', en: 'A category with this name already exists' },
  { vi: 'Danh muc voi slug nay da ton tai', en: 'A category with this slug already exists' },
  { vi: 'Email da ton tai', en: 'Email already exists' },
  { vi: 'Ma coupon da ton tai', en: 'Coupon code already exists' },
  { vi: 'Da dang ky khoa hoc nay roi', en: 'You are already enrolled in this course' },
  { vi: 'Khoa hoc da co trong gio hang', en: 'Course is already in cart' },
  { vi: 'Muc gio hang khong tim thay', en: 'Cart item not found' },
  { vi: 'Khoa hoc da co trong danh sach yeu thich', en: 'Course is already in wishlist' },
  { vi: 'Dang nhap that bai', en: 'Login failed' },
  { vi: 'Email hoac mat khau khong chinh xac', en: 'Invalid email or password' },
  { vi: 'Nguoi dung chua xac thuc email', en: 'Email is not verified' },
  { vi: 'Tai khoan cua ban da bi khoa', en: 'Your account has been locked' },
  { vi: 'Token khong hop le hoac da het han', en: 'Invalid or expired token' },
  { vi: 'Mat khau hien tai khong dung', en: 'Current password is incorrect' },
  { vi: 'Da dang xuat thanh cong', en: 'Logged out successfully' },
  { vi: 'Xac thuc email thanh cong', en: 'Email verified successfully' },
  { vi: 'Dat lai mat khau thanh cong', en: 'Password reset successfully' },
  { vi: 'Doi mat khau thanh cong', en: 'Password changed successfully' },
  { vi: 'Khong co file duoc tai len', en: 'No file uploaded' },
  { vi: 'Da tai len hinh anh thanh cong', en: 'Image uploaded successfully' },
  { vi: 'Da tai len video thanh cong', en: 'Video uploaded successfully' },
  { vi: 'Da tai len tai lieu thanh cong', en: 'Document uploaded successfully' },
  { vi: 'Da tai len anh dai dien thanh cong', en: 'Avatar uploaded successfully' },
  { vi: 'Khong the truy van giao dich', en: 'Cannot query transaction' },
  { vi: 'Khong the hoan tien giao dich', en: 'Cannot refund transaction' },
  { vi: 'Chu ky khong hop le', en: 'Invalid signature' },
  { vi: 'Xac nhan thanh cong', en: 'Confirmation successful' },
  { vi: 'Thanh toan thanh cong', en: 'Payment successful' },
  { vi: 'Thanh toan that bai', en: 'Payment failed' },
  { vi: 'Khong the tao giao dich', en: 'Unable to create transaction' },
  { vi: 'Khong the xac nhan giao dich', en: 'Unable to confirm transaction' },
  { vi: 'Khong tim thay giao dich', en: 'Transaction not found' },
  { vi: 'Chua xac thuc', en: 'Unauthenticated' },
  { vi: 'Khong the tai du lieu lich hoc', en: 'Unable to load schedule data' },
  { vi: 'Khong the tao lich hoc', en: 'Unable to create schedule item' },
  { vi: 'Khong the cap nhat lich hoc', en: 'Unable to update schedule item' },
  { vi: 'Khong the xoa lich hoc', en: 'Unable to delete schedule item' },
  { vi: 'Muc lich hoc khong tim thay', en: 'Schedule item not found' },
  { vi: 'Muc lich hoc da duoc xoa thanh cong', en: 'Schedule item deleted successfully' },
  { vi: 'Bai tap da duoc nop roi', en: 'Assignment has already been submitted' },
  { vi: 'Han nop bai tap da het', en: 'Assignment deadline has passed' },
  { vi: 'Bai nop khong tim thay', en: 'Submission not found' },
  { vi: 'Khong tim thay de thi da trich xuat', en: 'Extracted exam was not found' },
  { vi: 'Khong tim thay luot thi', en: 'Attempt not found' },
  { vi: 'Ban khong co quyen xem luot lam cua de thi nay', en: 'You do not have permission to view attempts of this exam' },
  { vi: 'Ban khong co quyen xem chi tiet luot thi nay', en: 'You do not have permission to view this attempt detail' },
  { vi: 'Bai thi that can chon chung chi', en: 'Official exam requires a certificate template' },
  { vi: 'Can it nhat 1 cau hoi', en: 'At least one question is required' },
  { vi: 'Da het thoi gian lam bai thi', en: 'Exam time is over' },
  { vi: 'Da het so lan thu', en: 'No attempts remaining' },
  { vi: 'Bai lam da hoan thanh roi', en: 'Attempt has already been completed' },
  { vi: 'Khong tim thay bai kiem tra', en: 'Quiz was not found' },
  { vi: 'Bai kiem tra phai co it nhat mot cau hoi', en: 'Quiz must have at least one question' },
  { vi: 'Danh gia khong tim thay', en: 'Review not found' },
  { vi: 'Ban da danh gia khoa hoc nay roi', en: 'You have already reviewed this course' },
  { vi: 'Ban chi co the cap nhat danh gia cua minh', en: 'You can only update your own review' },
  { vi: 'Ban chi co the xoa danh gia cua minh', en: 'You can only delete your own review' },
  { vi: 'Khong co quyen xem ket qua bai thi', en: 'You do not have permission to view exam results' },
  { vi: 'Khong the tai ket qua bai thi', en: 'Unable to load exam result' },
  { vi: 'Yeu cau khong hop le', en: 'Bad request' },
  { vi: 'Ban chua dang nhap hoac phien da het han', en: 'You are not signed in or your session has expired' },
  { vi: 'Qua nhieu yeu cau. Vui long thu lai sau', en: 'Too many requests. Please try again later' },
  { vi: 'Khong the ket noi den may chu', en: 'Cannot connect to the server' },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return value === 'vi' || value === 'en';
}

export function getRequestLanguage(request: Request): SupportedLanguage {
  const headerValue =
    (request.headers['x-client-language'] as string | undefined) ||
    (request.headers['X-Client-Language'] as string | undefined);

  if (!headerValue) return 'vi';

  const lang = headerValue.toLowerCase().startsWith('en') ? 'en' : 'vi';
  return isSupportedLanguage(lang) ? lang : 'vi';
}

export function localizeMessage(message: string, language: SupportedLanguage): string {
  if (!message || typeof message !== 'string') return message;

  const normalizedMessage = normalize(message);

  for (const entry of DICTIONARY) {
    const vi = normalize(entry.vi);
    const en = normalize(entry.en);
    if (normalizedMessage === vi || normalizedMessage === en) {
      return language === 'en' ? entry.en : entry.vi;
    }
  }

  // Pattern-based fallback for frequent classes of errors.
  if (/failed to fetch|network error|econnrefused|cannot connect/.test(normalizedMessage)) {
    return language === 'en'
      ? 'Cannot connect to the server. Please try again.'
      : 'Khong the ket noi den may chu. Vui long thu lai.';
  }
  if (/unauthorized|not authenticated|invalid credentials|token/.test(normalizedMessage)) {
    return language === 'en'
      ? 'You are not signed in or your session has expired.'
      : 'Ban chua dang nhap hoac phien da het han.';
  }
  if (/forbidden|insufficient permissions|access denied/.test(normalizedMessage)) {
    return language === 'en'
      ? 'You do not have permission to perform this action.'
      : 'Ban khong co quyen thuc hien thao tac nay.';
  }

  return message;
}

function localizeUnknown(value: unknown, language: SupportedLanguage): unknown {
  if (typeof value === 'string') return localizeMessage(value, language);
  if (Array.isArray(value)) return value.map((item) => localizeUnknown(item, language));
  if (!value || typeof value !== 'object') return value;

  const source = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(source)) {
    if (key === 'message') {
      output[key] = localizeUnknown(val, language);
      continue;
    }
    output[key] = localizeUnknown(val, language);
  }
  return output;
}

export function localizePayloadMessages<T>(payload: T, language: SupportedLanguage): T {
  return localizeUnknown(payload, language) as T;
}
