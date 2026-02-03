import { Controller, Get, Post, Param, UseGuards, Patch, Body, Delete } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole, User } from '../users/entities/user.entity';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@GetUser() user: User) {
    return this.certificatesService.findByTeacher(user.id);
  }

  @Post('enrollment/:enrollmentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  generateCertificate(@Param('enrollmentId') enrollmentId: string) {
    return this.certificatesService.generateCertificate(enrollmentId);
  }

  @Get('my-certificates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  findMyCertificates(@GetUser() user: User) {
    return this.certificatesService.findByStudent(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.certificatesService.findOne(id);
  }

  @Get('number/:certificateNumber')
  findByCertificateNumber(@Param('certificateNumber') certificateNumber: string) {
    return this.certificatesService.findByCertificateNumber(certificateNumber);
  }

  @Get('verify/:certificateNumber')
  verifyCertificate(@Param('certificateNumber') certificateNumber: string) {
    return this.certificatesService.verifyCertificate(certificateNumber);
  }

  // Admin endpoints
  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findPending() {
    return this.certificatesService.findPending();
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  approve(@Param('id') id: string) {
    return this.certificatesService.approveCertificate(id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  reject(@Param('id') id: string, @Body('reason') reason: string) {
    return this.certificatesService.rejectCertificate(id, reason);
  }

  @Post(':id/share')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  createShareLink(@Param('id') id: string, @GetUser() user: User) {
    return this.certificatesService.createShareLink(id, user.id);
  }

  @Get('public/share/:shareId')
  getSharedCertificate(@Param('shareId') shareId: string) {
    return this.certificatesService.getSharedCertificate(shareId);
  }

  // ==================== CERTIFICATE TEMPLATES ====================
  
  @Get('templates/my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getMyTemplates(@GetUser() user: User) {
    return this.certificatesService.findTemplatesByTeacher(user.id);
  }

  @Post('templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  createTemplate(@GetUser() user: User, @Body() data: any) {
    return this.certificatesService.createTemplate(user.id, data);
  }

  @Get('templates/:id')
  @UseGuards(JwtAuthGuard)
  getTemplate(@Param('id') id: string) {
    return this.certificatesService.findTemplateById(id);
  }

  @Patch('templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  updateTemplate(@Param('id') id: string, @GetUser() user: User, @Body() data: any) {
    return this.certificatesService.updateTemplate(id, user.id, data);
  }

  @Delete('templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  deleteTemplate(@Param('id') id: string, @GetUser() user: User) {
    return this.certificatesService.deleteTemplate(id, user.id);
  }

  @Post('templates/:id/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  submitTemplate(@Param('id') id: string, @GetUser() user: User) {
    return this.certificatesService.submitTemplateForApproval(id, user.id);
  }

  @Patch('templates/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  approveTemplate(@Param('id') id: string) {
    return this.certificatesService.approveTemplate(id);
  }

  @Patch('templates/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  rejectTemplate(@Param('id') id: string, @Body('reason') reason: string) {
    return this.certificatesService.rejectTemplate(id, reason);
  }
}
