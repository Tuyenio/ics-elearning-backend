import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

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
}
