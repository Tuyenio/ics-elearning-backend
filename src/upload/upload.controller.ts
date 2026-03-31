import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import type { AuthenticatedRequestUser } from '../common/types/authenticated-request';

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly usersService: UsersService,
  ) {}

  @Post('image')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UploadService.getUploadPath('image'),
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `file-${unique}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    this.uploadService.validateFile(file, 'image');

    const url = this.uploadService.generateFileUrl(file.filename, 'image');

    return {
      message: 'Đã tải lên hình ảnh thành công',
      url,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Post('video')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UploadService.getUploadPath('video'),
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `file-${unique}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadVideo(@UploadedFile() file: Express.Multer.File) {
    this.uploadService.validateFile(file, 'video');

    const url = this.uploadService.generateFileUrl(file.filename, 'video');

    return {
      message: 'Đã tải lên video thành công',
      url,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Post('document')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.STUDENT)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UploadService.getUploadPath('document'),
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `file-${unique}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadDocument(@UploadedFile() file: Express.Multer.File) {
    this.uploadService.validateFile(file, 'document');

    const url = this.uploadService.generateFileUrl(file.filename, 'document');

    return {
      message: 'Đã tải lên tài liệu thành công',
      url,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Post('avatar')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UploadService.getUploadPath('avatar'),
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `file-${unique}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return callback(
            new BadRequestException('Only image files are allowed!'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: AuthenticatedRequestUser,
  ) {
    if (!file) {
      throw new BadRequestException('Không có file được tải lên');
    }

    this.uploadService.validateFile(file, 'image');

    const url = this.uploadService.generateFileUrl(file.filename, 'avatar');

    await this.usersService.updateUserAvatar(user.id, url);

    return {
      success: true,
      message: 'Đã tải lên ảnh đại diện thành công',
      url,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
