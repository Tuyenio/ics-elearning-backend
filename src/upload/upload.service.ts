import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { extname, join, resolve } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { diskStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

type UploadFileType = 'image' | 'video' | 'document' | 'avatar';

@Injectable()
export class UploadService implements OnModuleInit {
  private static readonly uploadRoot = resolve(
    process.env.UPLOAD_ROOT || join(process.cwd(), 'uploads'),
  );

  private static readonly uploadSubdirs: Record<UploadFileType, string> = {
    image: 'images',
    video: 'videos',
    document: 'documents',
    avatar: 'avatars',
  };

  // Whitelist of allowed MIME types per upload category
  static readonly ALLOWED_MIME: Record<'image' | 'video' | 'document', string[]> = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ],
  };

  // Canonical extension derived from MIME type — never trust originalname extension
  private static readonly MIME_TO_EXT: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'video/x-msvideo': '.avi',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/plain': '.txt',
  };

  // Kept for belt-and-suspenders validation in validateFile()
  private readonly imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  private readonly videoExtensions = ['.mp4', '.webm', '.mov', '.avi'];
  private readonly documentExtensions = [
    '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt',
  ];

  private readonly maxImageSize = 5 * 1024 * 1024;      // 5MB
  private readonly maxVideoSize = 500 * 1024 * 1024;    // 500MB
  private readonly maxDocumentSize = 20 * 1024 * 1024;  // 20MB

  onModuleInit() {
    Object.keys(UploadService.uploadSubdirs).forEach((key) => {
      const type = key as UploadFileType;
      UploadService.ensureDirectory(UploadService.getUploadPath(type));
    });
  }

  /**
   * Returns a Multer fileFilter that checks both MIME type and filename extension
   * before Multer writes anything to disk. Files failing either check are rejected
   * immediately — no bytes are stored.
   */
  static getFileFilter(fileType: 'image' | 'video' | 'document') {
    return (
      req: any,
      file: Express.Multer.File,
      callback: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      const allowedMime = UploadService.ALLOWED_MIME[fileType];

      if (!allowedMime.includes(file.mimetype)) {
        return callback(
          new BadRequestException(
            `Loại tập tin không hợp lệ. Chỉ chấp nhận: ${allowedMime.join(', ')}`,
          ),
          false,
        );
      }

      // Extension from originalname must also correspond to an allowed MIME
      const declaredExt = extname(file.originalname).toLowerCase();
      const allowedExts = allowedMime
        .map((m) => UploadService.MIME_TO_EXT[m])
        .filter(Boolean);
      if (!allowedExts.includes(declaredExt)) {
        return callback(
          new BadRequestException(
            `Phần mở rộng tập tin không hợp lệ: "${declaredExt}"`,
          ),
          false,
        );
      }

      callback(null, true);
    };
  }

  /**
   * Returns the safe file extension derived from the server-verified MIME type.
   * Never uses the extension from the original filename, preventing .php/.exe/etc.
   * from appearing in the stored filename even if fileFilter is somehow bypassed.
   */
  static safeExtension(mimetype: string): string {
    return UploadService.MIME_TO_EXT[mimetype] ?? '.bin';
  }

  getMulterOptions(fileType: 'image' | 'video' | 'document'): MulterOptions {
    const uploadPath = UploadService.getUploadPath(fileType);
    const maxSize = this.getMaxFileSize(fileType);
    return {
      storage: diskStorage({
        destination: uploadPath,
        filename: (req, file, callback) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `file-${unique}${UploadService.safeExtension(file.mimetype)}`);
        },
      }),
      fileFilter: UploadService.getFileFilter(fileType),
      limits: { fileSize: maxSize },
    };
  }

  private getAllowedExtensions(fileType: 'image' | 'video' | 'document'): string[] {
    switch (fileType) {
      case 'image':    return this.imageExtensions;
      case 'video':    return this.videoExtensions;
      case 'document': return this.documentExtensions;
    }
  }

  private getMaxFileSize(fileType: 'image' | 'video' | 'document'): number {
    switch (fileType) {
      case 'image':    return this.maxImageSize;
      case 'video':    return this.maxVideoSize;
      case 'document': return this.maxDocumentSize;
    }
  }

  generateFileUrl(filename: string, fileType: UploadFileType): string {
    const baseUrl =
      process.env.APP_HOST || process.env.BASE_URL || 'http://localhost:5001';
    const subdir = UploadService.uploadSubdirs[fileType];
    return `${baseUrl}/uploads/${subdir}/${filename}`;
  }

  /** Removes a file from disk; used for cleanup when post-upload validation fails. */
  deleteFile(filePath: string): void {
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    } catch { /* intentionally ignored */ }
  }

  /**
   * Belt-and-suspenders validation called after Multer saves the file.
   * Deletes the file from disk before throwing so no invalid file lingers.
   */
  validateFile(
    file: Express.Multer.File,
    fileType: 'image' | 'video' | 'document' = 'image',
  ): void {
    if (!file) {
      throw new BadRequestException('Chưa tải lên tập tin');
    }

    const ext = extname(file.originalname).toLowerCase();
    const allowedExtensions = this.getAllowedExtensions(fileType);

    if (!allowedExtensions.includes(ext)) {
      this.deleteFile(file.path);
      throw new BadRequestException(
        `Loại tập tin không hợp lệ. Các loại cho phép: ${allowedExtensions.join(', ')}`,
      );
    }

    const maxSize = this.getMaxFileSize(fileType);
    if (file.size > maxSize) {
      this.deleteFile(file.path);
      throw new BadRequestException(
        `Kích thước tập tin quá lớn. Tối đa: ${maxSize / (1024 * 1024)}MB`,
      );
    }
  }

  static getUploadPath(fileType: UploadFileType): string {
    const subdir = UploadService.uploadSubdirs[fileType];
    const fullPath = join(UploadService.uploadRoot, subdir);
    UploadService.ensureDirectory(fullPath);
    return fullPath;
  }

  static ensureDirectory(path: string) {
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true });
    }
  }
}
