import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { Exam } from './entities/exam.entity';
import { ExamAttempt } from './entities/exam-attempt.entity';
import { CertificatesModule } from '../certificates/certificates.module';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { ExtractedExam } from './entities/extracted-exam.entity';
import { ExtractedExamsService } from './extracted-exams.service';
import { ExtractedExamsController } from './extracted-exams.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Exam, ExamAttempt, Enrollment, ExtractedExam]),
    forwardRef(() => CertificatesModule),
  ],
  controllers: [ExamsController, ExtractedExamsController],
  providers: [ExamsService, ExtractedExamsService],
  exports: [ExamsService, ExtractedExamsService],
})
export class ExamsModule {}
