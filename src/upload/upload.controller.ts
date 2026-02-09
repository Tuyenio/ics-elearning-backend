import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

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
      dest: './uploads/images',
    })
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    this.uploadService.validateFile(file);
    
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
      dest: './uploads/videos',
    })
  )
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    this.uploadService.validateFile(file);
    
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
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      dest: './uploads/documents',
    })
  )
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
    this.uploadService.validateFile(file);
    
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
      dest: './uploads/avatars',
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
    })
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('Không có file được tải lên');
    }
    
    this.uploadService.validateFile(file, 'image');
    
    const url = this.uploadService.generateFileUrl(file.filename, 'avatar');

    // Update user's avatar URL in database (req.user.id contains the user ID from JWT)
    await this.usersService.updateUserAvatar(req.user.id, url);
    
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
