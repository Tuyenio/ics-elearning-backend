import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';
import { Certificate } from './entities/certificate.entity';
import { CertificateTemplate } from './entities/certificate-template.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Exam } from '../exams/entities/exam.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Certificate, CertificateTemplate, Enrollment, Exam])],
  controllers: [CertificatesController],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
