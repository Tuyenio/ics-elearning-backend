import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificate } from './entities/certificate.entity';
import { User } from '../users/entities/user.entity';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity';

@Injectable()
export class CertificatesService {
  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
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
      where: { status: 'pending' },
      relations: ['student', 'course', 'enrollment'],
      order: { createdAt: 'DESC' },
    });
  }

  async approveCertificate(id: string) {
    const certificate = await this.findOne(id);
    certificate.status = 'approved';
    return this.certificateRepository.save(certificate);
  }

  async rejectCertificate(id: string, reason: string) {
    const certificate = await this.findOne(id);
    certificate.status = 'rejected';
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
}
