import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exam, ExamStatus, ExamType } from './entities/exam.entity';
import { ExamAttempt, AttemptStatus } from './entities/exam-attempt.entity';

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam)
    private examRepository: Repository<Exam>,
    @InjectRepository(ExamAttempt)
    private attemptRepository: Repository<ExamAttempt>,
  ) {}

  // ==================== TEACHER METHODS ====================

  async create(createExamDto: any, teacherId: string): Promise<Exam> {
    if (
      createExamDto.type === ExamType.OFFICIAL &&
      !createExamDto.certificateTemplateId
    ) {
      throw new BadRequestException(
        'Bài thi thật phải có mẫu chứng chỉ được chọn',
      );
    }

    const examData = {
      ...createExamDto,
      teacherId,
      status: ExamStatus.DRAFT,
    };

    const exam = this.examRepository.create(examData);
    return (await this.examRepository.save(exam)) as unknown as Exam;
  }

  async update(
    id: string,
    updateExamDto: any,
    teacherId: string,
  ): Promise<Exam> {
    const exam = await this.examRepository.findOne({
      where: { id, teacherId },
    });
    if (!exam) throw new NotFoundException('Không tìm thấy bài thi');
    if (exam.status === ExamStatus.APPROVED) {
      throw new BadRequestException('Không thể chỉnh sửa bài thi đã được duyệt');
    }

    Object.assign(exam, updateExamDto);
    if (exam.status === ExamStatus.REJECTED) {
      exam.status = ExamStatus.DRAFT;
      exam.rejectionReason = null;
    }

    return await this.examRepository.save(exam);
  }

  async updateAny(id: string, updateExamDto: any): Promise<Exam> {
    const exam = await this.examRepository.findOne({ where: { id } });
    if (!exam) throw new NotFoundException('Không tìm thấy bài thi');
    if (exam.status === ExamStatus.APPROVED) {
      throw new BadRequestException('Không thể chỉnh sửa bài thi đã được duyệt');
    }

    Object.assign(exam, updateExamDto);
    if (exam.status === ExamStatus.REJECTED) {
      exam.status = ExamStatus.DRAFT;
      exam.rejectionReason = null;
    }

    return await this.examRepository.save(exam);
  }

  async delete(id: string, teacherId: string): Promise<void> {
    const exam = await this.examRepository.findOne({
      where: { id, teacherId },
    });
    if (!exam) throw new NotFoundException('Không tìm thấy bài thi');
    if (exam.status === ExamStatus.APPROVED) {
      throw new BadRequestException('Không thể xóa bài thi đã được duyệt');
    }
    await this.examRepository.remove(exam);
  }

  async submitForApproval(id: string, teacherId: string): Promise<Exam> {
    const exam = await this.examRepository.findOne({
      where: { id, teacherId },
    });
    if (!exam) throw new NotFoundException('Không tìm thấy bài thi');
    if (
      exam.status !== ExamStatus.DRAFT &&
      exam.status !== ExamStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Chỉ có thể gửi duyệt bài thi nháp hoặc đã bị từ chối',
      );
    }
    if (!exam.questions || exam.questions.length === 0) {
      throw new BadRequestException('Bài thi phải có ít nhất 1 câu hỏi');
    }

    exam.status = ExamStatus.PENDING;
    exam.rejectionReason = null;
    return await this.examRepository.save(exam);
  }

  async findMyExams(teacherId: string): Promise<Exam[]> {
    return this.examRepository.find({
      where: { teacherId },
      relations: ['course'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Exam> {
    const exam = await this.examRepository.findOne({
      where: { id },
      relations: ['course', 'teacher'],
    });
    if (!exam) throw new NotFoundException('Không tìm thấy bài thi');
    return exam;
  }

  // ==================== ADMIN METHODS ====================

  async findAll(): Promise<Exam[]> {
    return this.examRepository.find({
      relations: ['course', 'teacher'],
      order: { createdAt: 'DESC' },
    });
  }

  async findPending(): Promise<Exam[]> {
    return this.examRepository.find({
      where: { status: ExamStatus.PENDING },
      relations: ['course', 'teacher'],
      order: { createdAt: 'DESC' },
    });
  }

  async approve(id: string): Promise<Exam> {
    const exam = await this.examRepository.findOne({ where: { id } });
    if (!exam) throw new NotFoundException('Không tìm thấy bài thi');
    if (exam.status !== ExamStatus.PENDING) {
      throw new BadRequestException('Chỉ có thể duyệt bài thi đang chờ duyệt');
    }

    exam.status = ExamStatus.APPROVED;
    exam.rejectionReason = null;
    return await this.examRepository.save(exam);
  }

  async reject(id: string, reason: string): Promise<Exam> {
    const exam = await this.examRepository.findOne({ where: { id } });
    if (!exam) throw new NotFoundException('Không tìm thấy bài thi');
    if (exam.status !== ExamStatus.PENDING) {
      throw new BadRequestException(
        'Chỉ có thể từ chối bài thi đang chờ duyệt',
      );
    }

    exam.status = ExamStatus.REJECTED;
    exam.rejectionReason = reason;
    return await this.examRepository.save(exam);
  }

  // ==================== STUDENT METHODS ====================

  async findAvailable(studentId: string): Promise<Exam[]> {
    return this.examRepository.find({
      where: { status: ExamStatus.APPROVED },
      relations: ['course', 'teacher'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCourse(courseId: string): Promise<Exam[]> {
    return this.examRepository.find({
      where: { courseId, status: ExamStatus.APPROVED },
      relations: ['course', 'teacher'],
      order: { createdAt: 'DESC' },
    });
  }

  async startExam(examId: string, studentId: string): Promise<ExamAttempt> {
    const exam = await this.examRepository.findOne({
      where: { id: examId, status: ExamStatus.APPROVED },
    });
    if (!exam)
      throw new NotFoundException(
        'Không tìm thấy bài thi hoặc bài thi chưa được duyệt',
      );

    const attemptCount = await this.attemptRepository.count({
      where: { examId, studentId, status: AttemptStatus.COMPLETED },
    });

    if (attemptCount >= exam.maxAttempts) {
      throw new BadRequestException(
        `Bạn đã sử dụng hết ${exam.maxAttempts} lần thi`,
      );
    }

    const inProgressAttempt = await this.attemptRepository.findOne({
      where: { examId, studentId, status: AttemptStatus.IN_PROGRESS },
    });

    if (inProgressAttempt) return inProgressAttempt;

    const totalPoints =
      exam.questions?.reduce((sum, q) => sum + q.points, 0) || 0;

    const attempt = this.attemptRepository.create({
      examId,
      studentId,
      status: AttemptStatus.IN_PROGRESS,
      startedAt: new Date(),
      answers: [],
      totalPoints,
      earnedPoints: 0,
      score: 0,
      passed: false,
      certificateIssued: false,
      timeSpent: 0,
    });

    return await this.attemptRepository.save(attempt);
  }

  async submitExam(
    attemptId: string,
    studentId: string,
    answers: any[],
  ): Promise<ExamAttempt> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, studentId },
      relations: ['exam'],
    });

    if (!attempt) throw new NotFoundException('Không tìm thấy bài làm');
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Bài làm đã được nộp');
    }

    const exam = attempt.exam;
    let earnedPoints = 0;

    const gradedAnswers = answers.map((answer) => {
      const question = exam.questions?.find((q) => q.id === answer.questionId);
      if (!question)
        return { ...answer, isCorrect: false, earnedPoints: 0 };

      const isCorrect = this.checkAnswer(
        question.correctAnswer,
        answer.answer,
      );
      const points = isCorrect ? question.points : 0;
      earnedPoints += points;

      return { ...answer, isCorrect, earnedPoints: points };
    });

    const totalPoints =
      exam.questions?.reduce((sum, q) => sum + q.points, 0) || 0;
    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= exam.passingScore;

    attempt.answers = gradedAnswers;
    attempt.earnedPoints = earnedPoints;
    attempt.totalPoints = totalPoints;
    attempt.score = score;
    attempt.passed = passed;
    attempt.status = AttemptStatus.COMPLETED;
    attempt.completedAt = new Date();
    attempt.timeSpent = Math.floor(
      (attempt.completedAt.getTime() - attempt.startedAt.getTime()) / 1000,
    );

    return await this.attemptRepository.save(attempt);
  }

  async getMyAttempts(studentId: string): Promise<ExamAttempt[]> {
    return this.attemptRepository.find({
      where: { studentId },
      relations: ['exam', 'exam.course'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAttemptResult(
    attemptId: string,
    studentId: string,
  ): Promise<ExamAttempt> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, studentId },
      relations: ['exam', 'exam.course', 'exam.teacher'],
    });
    if (!attempt) throw new NotFoundException('Không tìm thấy kết quả bài thi');
    return attempt;
  }

  private checkAnswer(correctAnswer: any, userAnswer: any): boolean {
    if (Array.isArray(correctAnswer) && Array.isArray(userAnswer)) {
      return (
        correctAnswer.length === userAnswer.length &&
        correctAnswer.every((a) => userAnswer.includes(a))
      );
    }

    if (
      typeof correctAnswer === 'string' &&
      typeof userAnswer === 'string'
    ) {
      return (
        correctAnswer.toLowerCase().trim() ===
        userAnswer.toLowerCase().trim()
      );
    }

    return false;
  }
}

