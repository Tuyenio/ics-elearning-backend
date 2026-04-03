import { Controller, Get, UseGuards, Patch, Param, Body, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CertificatesService } from '../certificates/certificates.service';
import { ExamsService } from '../exams/exams.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly certificatesService: CertificatesService,
    private readonly examsService: ExamsService,
  ) {}

  @Get('dashboard/stats')
  getDashboardStats(@Query('period') period?: string) {
    return this.adminService.getDashboardStats(period);
  }

  @Get('dashboard/growth')
  getGrowthStats(@Query('period') period?: string) {
    return this.adminService.getGrowthStats(period);
  }

  @Get('dashboard/categories/distribution')
  getCategoryDistribution() {
    return this.adminService.getCategoryDistribution();
  }

  @Get('reports/revenue')
  getRevenueReport(@Query('period') period?: string) {
    return this.adminService.getRevenueReport(period);
  }

  @Get('reports/users')
  getUserReport(@Query('period') period?: string) {
    return this.adminService.getUserReport(period);
  }

  @Get('reports/performance')
  getPerformanceReport(@Query('period') period?: string) {
    return this.adminService.getPerformanceReport(period);
  }

  @Get('courses')
  getCourses() {
    return this.adminService.getCourses();
  }

  // ==================== CERTIFICATE ENDPOINTS ====================

  @Get('certificate-templates')
  getCertificateTemplates() {
    return this.certificatesService.findTemplatesForAdmin();
  }

  @Get('certificates')
  getCertificates() {
    return this.certificatesService.findAllForAdmin();
  }

  @Patch('certificate-templates/:id/approve')
  approveCertificateTemplate(
    @Param('id') id: string,
    @Body('examId') examId?: string,
  ) {
    return this.certificatesService.approveTemplate(id, examId);
  }

  @Patch('certificate-templates/:id/reject')
  rejectCertificateTemplate(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.certificatesService.rejectTemplate(id, reason);
  }

  // ==================== EXAM ENDPOINTS ====================

  @Get('exams')
  getExams() {
    return this.examsService.findAll();
  }
}
