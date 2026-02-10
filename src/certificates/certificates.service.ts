import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificate, CertificateStatus } from './entities/certificate.entity';
import { CertificateTemplate, TemplateStatus } from './entities/certificate-template.entity';
import { User } from '../users/entities/user.entity';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity';
import { Exam, ExamType } from '../exams/entities/exam.entity';

@Injectable()
export class CertificatesService {
  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    @InjectRepository(CertificateTemplate)
    private readonly templateRepository: Repository<CertificateTemplate>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
  ) {}

  async generateCertificate(enrollmentId: string): Promise<Certificate> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['student', 'course'],
    });

    if (!enrollment) {
      throw new NotFoundException('Đăng ký không tìm thấy');
    }

    if (enrollment.status !== EnrollmentStatus.COMPLETED) {
      throw new ConflictException('Khóa học phải được hoàn thành để tạo chứng chỉ');
    }

    // Check if certificate already exists
    const existingCertificate = await this.certificateRepository.findOne({
      where: { enrollmentId },
    });

    if (existingCertificate) {
      return existingCertificate;
    }

    const certificateNumber = this.generateCertificateNumber();

    const certificate = this.certificateRepository.create({
      certificateNumber,
      studentId: enrollment.studentId,
      courseId: enrollment.courseId,
      enrollmentId: enrollment.id,
      issueDate: new Date(),
      metadata: {
        studentName: enrollment.student.name,
        courseName: enrollment.course.title,
        completionDate: enrollment.completedAt,
      },
    });

    return this.certificateRepository.save(certificate);
  }

  async findByStudent(studentId: string): Promise<Certificate[]> {
    return this.certificateRepository.find({
      where: { studentId },
      relations: ['course', 'student'],
      order: { issueDate: 'DESC' },
    });
  }

  async findAllForAdmin(): Promise<Certificate[]> {
    return this.certificateRepository.find({
      relations: ['course', 'student', 'enrollment'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByTeacher(teacherId: string): Promise<Certificate[]> {
    // Get certificates for courses taught by this teacher
    const certificates = await this.certificateRepository
      .createQueryBuilder('cert')
      .leftJoinAndSelect('cert.course', 'course')
      .leftJoinAndSelect('cert.student', 'student')
      .where('course.teacherId = :teacherId', { teacherId })
      .orderBy('cert.createdAt', 'DESC')
      .getMany();

    return certificates;
  }

  async findOne(id: string): Promise<Certificate> {
    const certificate = await this.certificateRepository.findOne({
      where: { id },
      relations: ['course', 'student', 'enrollment'],
    });

    if (!certificate) {
      throw new NotFoundException('Chứng chỉ không tìm thấy');
    }

    return certificate;
  }

  async findByCertificateNumber(certificateNumber: string): Promise<Certificate> {
    const certificate = await this.certificateRepository.findOne({
      where: { certificateNumber },
      relations: ['course', 'student', 'enrollment'],
    });

    if (!certificate) {
      throw new NotFoundException('Chứng chỉ không tìm thấy');
    }

    return certificate;
  }

  async verifyCertificate(certificateNumber: string): Promise<boolean> {
    const certificate = await this.certificateRepository.findOne({
      where: { certificateNumber },
    });

    return !!certificate;
  }

  async findPending() {
    return this.certificateRepository.find({
      where: { status: CertificateStatus.PENDING },
      relations: ['student', 'course', 'enrollment'],
      order: { createdAt: 'DESC' },
    });
  }

  async approveCertificate(id: string) {
    const certificate = await this.findOne(id);
    certificate.status = CertificateStatus.APPROVED;
    return this.certificateRepository.save(certificate);
  }

  async rejectCertificate(id: string, reason: string) {
    const certificate = await this.findOne(id);
    certificate.status = CertificateStatus.REJECTED;
    certificate.rejectionReason = reason;
    return this.certificateRepository.save(certificate);
  }

  async createShareLink(certificateId: string, userId: string) {
    const certificate = await this.findOne(certificateId);
    
    if (certificate.studentId !== userId) {
      throw new ForbiddenException('Bạn chỉ có thể chia sẻ chứng chỉ của mình');
    }

    if (!certificate.shareId) {
      certificate.shareId = this.generateShareId();
      await this.certificateRepository.save(certificate);
    }

    return {
      shareId: certificate.shareId,
      shareUrl: `/certificates/public/share/${certificate.shareId}`,
    };
  }

  async getSharedCertificate(shareId: string) {
    const certificate = await this.certificateRepository.findOne({
      where: { shareId },
      relations: ['student', 'course'],
    });

    if (!certificate) {
      throw new NotFoundException('Chứng chỉ được chia sẻ không tìm thấy');
    }

    return certificate;
  }

  private generateShareId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private generateCertificateNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CERT-${timestamp}-${random}`;
  }

  // ==================== CERTIFICATE TEMPLATES ====================
  
  async createTemplate(teacherId: string, data: Partial<CertificateTemplate>): Promise<CertificateTemplate> {
    const template = this.templateRepository.create({
      ...data,
      teacherId,
      status: TemplateStatus.DRAFT,
    });
    return this.templateRepository.save(template);
  }

  async findTemplatesByTeacher(teacherId: string): Promise<CertificateTemplate[]> {
    return this.templateRepository.find({
      where: { teacherId },
      relations: ['course'],
      order: { createdAt: 'DESC' },
    });
  }

  async findTemplatesForAdmin(status?: TemplateStatus): Promise<CertificateTemplate[]> {
    return this.templateRepository.find({
      where: status ? { status } : {},
      relations: ['course', 'teacher'],
      order: { createdAt: 'DESC' },
    });
  }

  async findTemplateById(id: string): Promise<CertificateTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['course', 'teacher'],
    });

    if (!template) {
      throw new NotFoundException('Mẫu chứng chỉ không tìm thấy');
    }

    return template;
  }

  async updateTemplate(id: string, teacherId: string, data: Partial<CertificateTemplate>): Promise<CertificateTemplate> {
    const template = await this.findTemplateById(id);

    if (template.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền cập nhật mẫu này');
    }

    Object.assign(template, data);
    return this.templateRepository.save(template);
  }

  async deleteTemplate(id: string, teacherId: string): Promise<void> {
    const template = await this.findTemplateById(id);

    if (template.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền xóa mẫu này');
    }

    await this.templateRepository.remove(template);
  }

  async submitTemplateForApproval(id: string, teacherId: string): Promise<CertificateTemplate> {
    const template = await this.findTemplateById(id);

    if (template.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền gửi duyệt mẫu này');
    }

    template.status = TemplateStatus.PENDING;
    return this.templateRepository.save(template);
  }

  async approveTemplate(id: string, examId?: string): Promise<CertificateTemplate> {
    const template = await this.findTemplateById(id);

    if (template.status !== TemplateStatus.PENDING) {
      throw new BadRequestException('Chỉ có thể duyệt mẫu chứng chỉ đang chờ duyệt');
    }

    if (examId) {
      const exam = await this.examRepository.findOne({ where: { id: examId } });
      if (!exam) {
        throw new NotFoundException('Không tìm thấy bài thi');
      }
      if (exam.type !== ExamType.OFFICIAL) {
        throw new BadRequestException('Chỉ có thể gắn mẫu chứng chỉ vào bài thi thật');
      }
      if (exam.courseId !== template.courseId) {
        throw new BadRequestException('Bài thi phải thuộc cùng khóa học với mẫu chứng chỉ');
      }
      exam.certificateTemplateId = template.id;
      await this.examRepository.save(exam);
    }

    template.status = TemplateStatus.APPROVED;
    template.rejectionReason = null;
    return this.templateRepository.save(template);
  }

  async rejectTemplate(id: string, reason: string): Promise<CertificateTemplate> {
    const template = await this.findTemplateById(id);
    template.status = TemplateStatus.REJECTED;
    template.rejectionReason = reason;
    return this.templateRepository.save(template);
  }
}
