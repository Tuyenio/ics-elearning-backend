import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { extname, join, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
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

  // Allowed file types
  private readonly imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  private readonly videoExtensions = ['.mp4', '.webm', '.mov', '.avi'];
  private readonly documentExtensions = [
    '.pdf',
    '.doc',
    '.docx',
    '.ppt',
    '.pptx',
    '.xls',
    '.xlsx',
    '.txt',
  ];

  // Max file sizes (in bytes)
  private readonly maxImageSize = 5 * 1024 * 1024; // 5MB
  private readonly maxVideoSize = 500 * 1024 * 1024; // 500MB
  private readonly maxDocumentSize = 20 * 1024 * 1024; // 20MB

  onModuleInit() {
    // Đảm bảo thư mục uploads tồn tại khi khởi động (đặc biệt trên server mới)
    Object.keys(UploadService.uploadSubdirs).forEach((key) => {
      const type = key as UploadFileType;
      const dir = UploadService.getUploadPath(type);
      UploadService.ensureDirectory(dir);
    });
  }

  getMulterOptions(fileType: 'image' | 'video' | 'document'): MulterOptions {
    const uploadPath = UploadService.getUploadPath(fileType);
    const allowedExtensions = this.getAllowedExtensions(fileType);
    const maxSize = this.getMaxFileSize(fileType);

    return {
      storage: diskStorage({
        destination: uploadPath,
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
          return callback(
            new BadRequestException(
              `Loại tập tin không hợp lệ. Các loại cho phép: ${allowedExtensions.join(', ')}`,
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: maxSize,
      },
    };
  }

  private getAllowedExtensions(
    fileType: 'image' | 'video' | 'document',
  ): string[] {
    switch (fileType) {
      case 'image':
        return this.imageExtensions;
      case 'video':
        return this.videoExtensions;
      case 'document':
        return this.documentExtensions;
    }
  }

  private getMaxFileSize(fileType: 'image' | 'video' | 'document'): number {
    switch (fileType) {
      case 'image':
        return this.maxImageSize;
      case 'video':
        return this.maxVideoSize;
      case 'document':
        return this.maxDocumentSize;
    }
  }

  generateFileUrl(
    filename: string,
    fileType: UploadFileType,
  ): string {
    const baseUrl =
      process.env.APP_HOST || process.env.BASE_URL || 'http://localhost:5001';
    const subdir = UploadService.uploadSubdirs[fileType];
    return `${baseUrl}/uploads/${subdir}/${filename}`;
  }

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
      throw new BadRequestException(
        `Loại tập tin không hợp lệ. Các loại cho phép: ${allowedExtensions.join(', ')}`,
      );
    }

    const maxSize = this.getMaxFileSize(fileType);
    if (file.size > maxSize) {
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
