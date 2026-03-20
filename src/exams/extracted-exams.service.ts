import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ExtractedExam,
  ExtractedExamStatus,
  ExtractedExamType,
} from './entities/extracted-exam.entity';
import {
  CreateExtractedExamDto,
  ExtractedExamStatusDto,
  ExtractedExamTypeDto,
} from './dto/create-extracted-exam.dto';
import {
  Enrollment,
  EnrollmentStatus,
} from '../enrollments/entities/enrollment.entity';
import { Course } from '../courses/entities/course.entity';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class ExtractedExamsService {
  constructor(
    @InjectRepository(ExtractedExam)
    private readonly extractedExamRepo: Repository<ExtractedExam>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
  ) {}

  private normalizeStatus(
    status?: ExtractedExamStatusDto,
  ): ExtractedExamStatus {
    if (!status) return ExtractedExamStatus.APPROVED;
    const normalized = String(status).toLowerCase();
    if (normalized === ExtractedExamStatus.DRAFT)
      return ExtractedExamStatus.DRAFT;
    if (normalized === ExtractedExamStatus.PENDING)
      return ExtractedExamStatus.PENDING;
    if (normalized === ExtractedExamStatus.REJECTED)
      return ExtractedExamStatus.REJECTED;
    return ExtractedExamStatus.APPROVED;
  }

  private normalizeType(type?: ExtractedExamTypeDto): ExtractedExamType {
    if (!type) return ExtractedExamType.PRACTICE;
    const normalized = String(type).toLowerCase();
    return normalized === ExtractedExamType.OFFICIAL
      ? ExtractedExamType.OFFICIAL
      : ExtractedExamType.PRACTICE;
  }

  private validateOfficial(dto: CreateExtractedExamDto) {
    if (
      dto.type === ExtractedExamTypeDto.OFFICIAL &&
      !dto.certificateTemplateId
    ) {
      throw new BadRequestException('Bài thi thật cần chọn chứng chỉ');
    }
  }

  async create(dto: CreateExtractedExamDto, teacherId: string, role: UserRole) {
    this.validateOfficial(dto);
    if (!dto.questions || dto.questions.length === 0) {
      throw new BadRequestException('Cần ít nhất 1 câu hỏi');
    }

    const course = await this.courseRepo.findOne({
      where: { id: dto.courseId },
    });
    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học');
    }
    if (role !== UserRole.ADMIN && course.teacherId !== teacherId) {
      throw new BadRequestException(
        'Bạn chỉ được tạo đề thi từ khóa học của chính mình',
      );
    }

    // Normalize datetime strings to Date to satisfy entity typing
    const availableFrom = dto.availableFrom
      ? new Date(dto.availableFrom)
      : undefined;
    const availableUntil = dto.availableUntil
      ? new Date(dto.availableUntil)
      : undefined;

    const payload: Partial<ExtractedExam> = {
      ...dto,
      availableFrom,
      availableUntil,
      teacherId,
      status: this.normalizeStatus(dto.status),
      type: this.normalizeType(dto.type),
    };

    const entity = this.extractedExamRepo.create(payload as ExtractedExam);
    return this.extractedExamRepo.save(entity);
  }

  async findMy(teacherId: string) {
    return this.extractedExamRepo.find({
      where: { teacherId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, teacherId: string) {
    const exam = await this.extractedExamRepo.findOne({
      where: { id, teacherId },
    });
    if (!exam) throw new NotFoundException('Không tìm thấy đề thi');
    return exam;
  }

  async update(
    id: string,
    teacherId: string,
    role: UserRole,
    dto: Partial<CreateExtractedExamDto>,
  ) {
    const exam = await this.extractedExamRepo.findOne({
      where: { id, teacherId },
    });
    if (!exam) throw new NotFoundException('Không tìm thấy đề thi');

    if (
      dto.type === ExtractedExamTypeDto.OFFICIAL &&
      !dto.certificateTemplateId &&
      !exam.certificateTemplateId
    ) {
      throw new BadRequestException('Bài thi thật cần chọn chứng chỉ');
    }

    const nextStatus = dto.status
      ? this.normalizeStatus(dto.status)
      : undefined;
    const nextType = dto.type ? this.normalizeType(dto.type) : undefined;

    if (dto.courseId && dto.courseId !== exam.courseId) {
      const targetCourse = await this.courseRepo.findOne({
        where: { id: dto.courseId },
      });
      if (!targetCourse) {
        throw new NotFoundException('Không tìm thấy khóa học');
      }
      if (role !== UserRole.ADMIN && targetCourse.teacherId !== teacherId) {
        throw new BadRequestException(
          'Bạn chỉ được gán đề thi vào khóa học của chính mình',
        );
      }
    }

    const updatePayload: Partial<ExtractedExam> = {
      ...dto,
      status: nextStatus ?? exam.status,
      type: nextType ?? exam.type,
    } as Partial<ExtractedExam>;

    await this.extractedExamRepo.update(id, updatePayload);
    return this.findOne(id, teacherId);
  }

  async remove(id: string, teacherId: string) {
    const exam = await this.extractedExamRepo.findOne({
      where: { id, teacherId },
    });
    if (!exam) throw new NotFoundException('Không tìm thấy đề thi');
    await this.extractedExamRepo.delete(id);
    return { success: true };
  }

  async findAvailableForStudent(studentId: string) {
    return this.extractedExamRepo
      .createQueryBuilder('exam')
      .innerJoin(
        Enrollment,
        'enrollment',
        `enrollment."courseId" = exam."courseId"
         AND enrollment."studentId" = :studentId
         AND enrollment."status" IN (:...statuses)`,
        {
          studentId,
          statuses: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
        },
      )
      .leftJoinAndSelect('exam.course', 'course')
      .where('exam.status = :status', { status: ExtractedExamStatus.APPROVED })
      .orderBy('exam.createdAt', 'DESC')
      .getMany();
  }

  async findOneForStudent(id: string, studentId: string) {
    const exam = await this.extractedExamRepo.findOne({
      where: { id, status: ExtractedExamStatus.APPROVED },
      relations: ['course'],
    });

    if (!exam) {
      throw new NotFoundException('Không tìm thấy đề thi đã trích xuất');
    }

    const enrollment = await this.enrollmentRepo.findOne({
      where: {
        studentId,
        courseId: exam.courseId,
      },
    });

    if (
      !enrollment ||
      ![EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED].includes(
        enrollment.status,
      )
    ) {
      throw new BadRequestException(
        'Bạn chưa đăng ký khóa học của bài thi này',
      );
    }

    const now = new Date();
    if (exam.availableFrom && now < new Date(exam.availableFrom)) {
      throw new BadRequestException(
        'Chưa đến thời gian mở bài thi, vui lòng quay lại sau',
      );
    }

    if (exam.availableUntil && now > new Date(exam.availableUntil)) {
      throw new BadRequestException('Đã hết thời gian làm bài thi');
    }

    return exam;
  }

  async submitForStudent(
    id: string,
    studentId: string,
    answers: Array<{ questionId: string; answer: string | string[] }>,
  ) {
    const exam = await this.findOneForStudent(id, studentId);
    const questions = Array.isArray(exam.questions) ? exam.questions : [];

    let earnedPoints = 0;
    const totalPoints = questions.reduce(
      (sum, q: any) => sum + Number(q?.points || 0),
      0,
    );

    const questionResults = questions.map((question: any) => {
      const answer = answers.find((a) => a.questionId === question.id);
      const userAnswer = answer?.answer;
      const isCorrect = this.checkAnswer(question.correctAnswer, userAnswer);
      const points = isCorrect ? Number(question?.points || 0) : 0;
      earnedPoints += points;

      return {
        id: question.id,
        type: question.type,
        question: question.question,
        image: question.image,
        options: Array.isArray(question.options) ? question.options : [],
        userAnswer,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        isCorrect,
      };
    });

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= Number(exam.passingScore || 0);

    return {
      id: `extracted-${Date.now()}`,
      score,
      passed,
      earnedPoints,
      totalPoints,
      certificateId: null,
      exam: {
        id: exam.id,
        title: exam.title,
        passingScore: exam.passingScore,
        type: exam.type,
      },
      questionResults,
    };
  }

  private checkAnswer(correctAnswer: any, userAnswer: any): boolean {
    if (Array.isArray(correctAnswer) && Array.isArray(userAnswer)) {
      return (
        correctAnswer.length === userAnswer.length &&
        correctAnswer.every((answer) => userAnswer.includes(answer))
      );
    }

    if (typeof correctAnswer === 'string' && typeof userAnswer === 'string') {
      return (
        correctAnswer.toLowerCase().trim() === userAnswer.toLowerCase().trim()
      );
    }

    return false;
  }
}
