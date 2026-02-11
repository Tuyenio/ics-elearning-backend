import { Injectable, BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import { diskStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

@Injectable()
export class UploadService {
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

  getMulterOptions(fileType: 'image' | 'video' | 'document'): MulterOptions {
    const uploadPath = `./uploads/${fileType}s`;
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
    fileType: 'image' | 'video' | 'document' | 'avatar',
  ): string {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5001';
    if (fileType === 'avatar') {
      return `${baseUrl}/uploads/avatars/${filename}`;
    }
    return `${baseUrl}/uploads/${fileType}s/${filename}`;
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
}
