/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-enum-comparison, @typescript-eslint/no-redundant-type-constituents */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Exam, ExamStatus, ExamType } from './entities/exam.entity';
import { ExamAttempt, AttemptStatus } from './entities/exam-attempt.entity';
import { Course } from '../courses/entities/course.entity';
import {
  Enrollment,
  EnrollmentStatus,
} from '../enrollments/entities/enrollment.entity';
import { CertificatesService } from '../certificates/certificates.service';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam)
    private examRepository: Repository<Exam>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(ExamAttempt)
    private attemptRepository: Repository<ExamAttempt>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectDataSource()
    private dataSource: DataSource,
    @Inject(forwardRef(() => CertificatesService))
    private certificatesService: CertificatesService,
  ) {}

  // ==================== TEACHER METHODS ====================

  async create(
    createExamDto: any,
    teacherId: string,
    role: UserRole,
  ): Promise<Exam> {
    const course = await this.courseRepository.findOne({
      where: { id: createExamDto.courseId },
    });
    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học');
    }
    if (role !== UserRole.ADMIN && course.teacherId !== teacherId) {
      throw new BadRequestException(
        'Bạn chỉ được tạo ngân hàng đề thi cho khóa học của chính mình',
      );
    }

    if (
      createExamDto.type === ExamType.OFFICIAL &&
      !createExamDto.certificateTemplateId
    ) {
      throw new BadRequestException(
        'Bài thi thật phải có mẫu chứng chỉ được chọn',
      );
    }

    // Sanitize datetime fields - convert invalid values to null
    if ('availableFrom' in createExamDto) {
      const val = createExamDto.availableFrom;
      if (val === null || val === undefined || val === '') {
        createExamDto.availableFrom = null;
      } else {
        try {
          const date = new Date(val);
          if (Number.isNaN(date.getTime())) {
            createExamDto.availableFrom = null;
          }
        } catch {
          createExamDto.availableFrom = null;
        }
      }
    }

    if ('availableUntil' in createExamDto) {
      const val = createExamDto.availableUntil;
      if (val === null || val === undefined || val === '') {
        createExamDto.availableUntil = null;
      } else {
        try {
          const date = new Date(val);
          if (Number.isNaN(date.getTime())) {
            createExamDto.availableUntil = null;
          }
        } catch {
          createExamDto.availableUntil = null;
        }
      }
    }

    this.validateAvailabilityWindow(
      createExamDto.availableFrom,
      createExamDto.availableUntil,
    );

    console.log(
      '[create] createExamDto.questions.length:',
      createExamDto.questions?.length,
    );

    // *** DISABLE normalization for draft exams - only preserve raw payload ***
    // Strict normalization is done at submit-for-approval time

    // Handle questions structure - may be wrapped in arrays with properties
    let questionsToSave = createExamDto.questions || [];
    if (Array.isArray(questionsToSave) && questionsToSave.length > 0) {
      const firstItem = questionsToSave[0];

      // Check if first item is an array (indicates structure issue)
      if (Array.isArray(firstItem)) {
        console.log('[create] Detected array type for question item');
        console.log('[create] First item Array.length:', firstItem.length);
        console.log('[create] First item Object.keys:', Object.keys(firstItem));

        // If it's an empty array with properties, extract the properties as question objects
        if (firstItem.length === 0 && Object.keys(firstItem).length > 0) {
          console.log(
            '[create] Array has properties but no numeric indices - extracting objects',
          );
          questionsToSave = questionsToSave.map((item) => {
            const obj: any = {};
            for (const key of Object.keys(item)) {
              obj[key] = item[key];
            }
            return obj;
          });
          console.log(
            '[create] After extraction: length =',
            questionsToSave.length,
          );
        } else if (firstItem.length > 0) {
          // If it's a proper array with items, just flatten it
          console.log('[create] Array has numeric indices - flattening');
          questionsToSave = questionsToSave.flat();
          console.log(
            '[create] After flatten: length =',
            questionsToSave.length,
          );
        }
      }
    }

    const requestedStatus = String(createExamDto?.status || '').toLowerCase();
    const effectiveStatus =
      requestedStatus === ExamStatus.DRAFT
        ? ExamStatus.DRAFT
        : ExamStatus.APPROVED;

    const examData = {
      ...createExamDto,
      questions: questionsToSave,
      teacherId,
      status: effectiveStatus,
      rejectionReason: null,
    };

    console.log(
      '[create] examData.questions sample (first 2):',
      examData.questions?.slice(0, 2),
    );

    // Log the structure of first question to debug serialization
    if (examData.questions && examData.questions.length > 0) {
      const firstQuestion = examData.questions[0];
      console.log('[create] First question structure:', {
        hasId: 'id' in firstQuestion,
        hasType: 'type' in firstQuestion,
        hasQuestion: 'question' in firstQuestion,
        hasOptions: 'options' in firstQuestion,
        keys: Object.keys(firstQuestion),
        stringified: JSON.stringify(firstQuestion),
      });
    }

    const exam = this.examRepository.create(examData) as unknown as Exam;

    // Log exam object before save
    console.log(
      '[create] exam.questions before save first 2:',
      (exam.questions as any[])?.slice(0, 2),
    );
    console.log(
      '[create] exam.questions.length:',
      (exam.questions as any[])?.length,
    );

    if ((exam.questions as any[])?.length > 0) {
      const firstQuestion = (exam.questions as any[])[0];
      console.log('[create] First question before save:', firstQuestion);
    }

    const saved = await this.examRepository.save(exam);

    // Log after save
    console.log(
      '[create] saved.questions.length after save:',
      (saved.questions as any[])?.length,
    );
    if ((saved.questions as any[])?.length > 0) {
      console.log(
        '[create] saved.questions first 2 after save:',
        (saved.questions as any[])?.slice(0, 2),
      );
    }

    return saved as unknown as Exam;
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

    const { questions: rawQuestions, ...metaFields } = updateExamDto;

    if (metaFields.courseId && metaFields.courseId !== exam.courseId) {
      const targetCourse = await this.courseRepository.findOne({
        where: { id: metaFields.courseId },
      });
      if (!targetCourse) {
        throw new NotFoundException('Không tìm thấy khóa học');
      }
      if (targetCourse.teacherId !== teacherId) {
        throw new BadRequestException(
          'Bạn chỉ được gán bài thi vào khóa học của chính mình',
        );
      }
    }

    if (!metaFields.status && exam.status !== ExamStatus.DRAFT) {
      metaFields.status = ExamStatus.APPROVED;
    }
    metaFields.rejectionReason = null;

    if (rawQuestions !== undefined) {
      const normalizedQuestions = this.normalizeQuestionsPayload(rawQuestions);
      const finalQuestions =
        normalizedQuestions.length > 0
          ? normalizedQuestions
          : this.buildQuestionsFallback(rawQuestions);
      console.log(
        '[update] Saving',
        normalizedQuestions.length,
        'questions for exam',
        id,
      );
      await this.dataSource.query(
        `UPDATE learning.exams SET questions = $1::json WHERE id = $2`,
        [JSON.stringify(finalQuestions), id],
      );
    }

    if (Object.keys(metaFields).length > 0) {
      await this.examRepository.update(id, metaFields);
    }
    // Return freshly loaded entity so the response includes the saved questions
    return (await this.examRepository.findOne({
      where: { id },
      relations: ['course', 'teacher'],
    }))!;
  }

  async updateAny(id: string, updateExamDto: any): Promise<Exam> {
    const exam = await this.examRepository.findOne({ where: { id } });
    if (!exam) throw new NotFoundException('Không tìm thấy bài thi');

    const { questions: rawQuestions, ...metaFields } = updateExamDto;

    // Sanitize datetime fields - convert invalid values to null
    if ('availableFrom' in metaFields) {
      const val = metaFields.availableFrom;
      if (val === null || val === undefined || val === '') {
        metaFields.availableFrom = null;
      } else {
        try {
          const date = new Date(val);
          if (Number.isNaN(date.getTime())) {
            metaFields.availableFrom = null;
          }
        } catch {
          metaFields.availableFrom = null;
        }
      }
    }

    if ('availableUntil' in metaFields) {
      const val = metaFields.availableUntil;
      if (val === null || val === undefined || val === '') {
        metaFields.availableUntil = null;
      } else {
        try {
          const date = new Date(val);
          if (Number.isNaN(date.getTime())) {
            metaFields.availableUntil = null;
          }
        } catch {
          metaFields.availableUntil = null;
        }
      }
    }

    this.validateAvailabilityWindow(
      metaFields.availableFrom,
      metaFields.availableUntil,
    );

    if (!metaFields.status && exam.status !== ExamStatus.DRAFT) {
      metaFields.status = ExamStatus.APPROVED;
    }
    metaFields.rejectionReason = null;

    if (rawQuestions !== undefined) {
      const normalizedQuestions = this.normalizeQuestionsPayload(rawQuestions);
      const finalQuestions =
        normalizedQuestions.length > 0
          ? normalizedQuestions
          : this.buildQuestionsFallback(rawQuestions);
      console.log(
        '[updateAny] raw type:',
        typeof rawQuestions,
        'normalized:',
        normalizedQuestions.length,
        'final:',
        finalQuestions.length,
        'exam:',
        id,
      );
      await this.dataSource.query(
        `UPDATE learning.exams SET questions = $1::json WHERE id = $2`,
        [JSON.stringify(finalQuestions), id],
      );
    }

    if (Object.keys(metaFields).length > 0) {
      await this.examRepository.update(id, metaFields);
    }
    // Return freshly loaded entity so the response includes the saved questions
    return (await this.examRepository.findOne({
      where: { id },
      relations: ['course', 'teacher'],
    }))!;
  }

  async delete(id: string, teacherId: string): Promise<void> {
    const exam = await this.examRepository.findOne({
      where: { id, teacherId },
    });
    if (!exam) throw new NotFoundException('Không tìm thấy bài thi');
    await this.examRepository.remove(exam);
  }

  async adminDelete(id: string): Promise<void> {
    const exam = await this.examRepository.findOne({ where: { id } });
    if (!exam) throw new NotFoundException('Không tìm thấy bài thi');
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

    // Read questions directly via raw SQL to bypass any ORM identity-map staleness
    const rawRows = await this.dataSource.query(
      `SELECT questions FROM learning.exams WHERE id = $1`,
      [id],
    );
    const questionsRaw = rawRows?.[0]?.questions ?? null;
    const questionsArray = this.coerceQuestionsArray(questionsRaw);
    console.log(
      '[submitForApproval] exam:',
      id,
      'questionsArray.length:',
      questionsArray.length,
      'sample:',
      questionsArray.slice(0, 1),
    );

    const hasQuestions =
      questionsArray.length > 0 &&
      questionsArray.some((q: any) => {
        if (!q || typeof q !== 'object') return false;
        const text = String(q.question || q.text || q.content || '').trim();
        const hasOptions =
          Array.isArray(q.options) &&
          q.options.some((o: any) => String(o || '').trim().length > 0);
        const hasAnswer =
          String(q.correctAnswer || q.answer || '').trim().length > 0;
        return text.length > 0 || hasOptions || hasAnswer;
      });

    if (!hasQuestions) {
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

  /**
   * Fetch all exams from the exam bank for admin management.
   * This returns only regular exams created by teachers (exam bank).
   * INTENTIONALLY EXCLUDES extracted exams for students (see ExtractedExamsService).
   *
   * Extracted exams are student-specific practice exams created for learning purposes
   * and are not managed by admins through this endpoint.
   */
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
    return this.examRepository
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
      .leftJoinAndSelect('exam.teacher', 'teacher')
      .where('exam.status = :status', { status: ExamStatus.APPROVED })
      .orderBy('exam.createdAt', 'DESC')
      .getMany();
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

    const enrollment = await this.enrollmentRepository.findOne({
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

    const questions = this.coerceQuestionsArray(exam.questions);
    const totalPoints = questions.reduce(
      (sum, q: any) => sum + Number(q?.points || 0),
      0,
    );

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
    const questions = this.coerceQuestionsArray(exam.questions);
    let earnedPoints = 0;

    const gradedAnswers = answers.map((answer) => {
      const question = questions.find((q: any) => q.id === answer.questionId);
      if (!question) return { ...answer, isCorrect: false, earnedPoints: 0 };

      const isCorrect = this.checkAnswer(question.correctAnswer, answer.answer);
      const points = isCorrect ? question.points : 0;
      earnedPoints += points;

      return { ...answer, isCorrect, earnedPoints: points };
    });

    const totalPoints = questions.reduce(
      (sum, q: any) => sum + Number(q?.points || 0),
      0,
    );
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
    const savedAttempt = await this.attemptRepository.save(attempt);

    if (savedAttempt.passed && exam.type === ExamType.OFFICIAL) {
      const enrollment = await this.enrollmentRepository.findOne({
        where: { studentId, courseId: exam.courseId },
      });

      if (enrollment) {
        const certificate =
          await this.certificatesService.generateCertificateForExamPass(
            enrollment.id,
            {
              examId: exam.id,
              score: savedAttempt.score,
              attemptId: savedAttempt.id,
            },
          );

        savedAttempt.certificateIssued = true;
        savedAttempt.certificateId = certificate.id;
        return this.attemptRepository.save(savedAttempt);
      }
    }

    return savedAttempt;
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

    if (typeof correctAnswer === 'string' && typeof userAnswer === 'string') {
      return (
        correctAnswer.toLowerCase().trim() === userAnswer.toLowerCase().trim()
      );
    }

    return false;
  }

  private normalizeQuestionsPayload(rawQuestions: any): any[] {
    const questionsArray = this.coerceQuestionsArray(rawQuestions);

    console.log(
      '[normalizeQuestionsPayload] Processing',
      questionsArray.length,
      'raw questions',
    );
    const normalized = questionsArray
      .map((raw, index) => {
        const result = this.normalizeSingleQuestion(raw, index);
        console.log(
          `[normalizeQuestionsPayload] Question ${index}: ${result ? 'kept' : 'filtered'}`,
        );
        return result;
      })
      .filter((item) => item !== null);

    console.log(
      '[normalizeQuestionsPayload] After normalize:',
      normalized.length,
      'questions',
    );
    return normalized;
  }

  private validateAvailabilityWindow(
    availableFrom?: string | Date | null,
    availableUntil?: string | Date | null,
  ): void {
    if (!availableFrom || !availableUntil) {
      return;
    }

    const fromDate = new Date(availableFrom);
    const untilDate = new Date(availableUntil);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(untilDate.getTime())) {
      throw new BadRequestException('Thời gian mở/đóng bài thi không hợp lệ');
    }

    if (untilDate <= fromDate) {
      throw new BadRequestException(
        'Thời gian kết thúc phải sau thời gian bắt đầu',
      );
    }
  }

  private hasAnyQuestionContent(rawQuestions: any): boolean {
    const questionsArray = this.coerceQuestionsArray(rawQuestions);

    if (questionsArray.length === 0) {
      console.log(
        '[hasAnyQuestionContent] Not array or empty:',
        Array.isArray(questionsArray),
        questionsArray?.length,
      );
      return false;
    }

    const hasContent = (value: any): boolean => {
      if (value === undefined || value === null) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (typeof value === 'number' || typeof value === 'boolean') return true;
      if (Array.isArray(value)) return value.some((item) => hasContent(item));
      if (typeof value === 'object') {
        return Object.values(value).some((item) => hasContent(item));
      }
      return false;
    };

    const result = questionsArray.some((question) => hasContent(question));
    console.log(
      '[hasAnyQuestionContent] result:',
      result,
      'for',
      questionsArray.length,
      'questions',
    );
    return result;
  }

  private coerceQuestionsArray(rawQuestions: any): any[] {
    let data = rawQuestions;

    while (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.log(
          '[coerceQuestionsArray] Failed to parse string questions:',
          e?.message || e,
        );
        return [];
      }
    }

    if (Array.isArray(data)) {
      return data;
    }

    if (!data || typeof data !== 'object') {
      return [];
    }

    // Handle accidental object-with-numeric-keys shape: { "0": {...}, "1": {...} }
    const keys = Object.keys(data);
    const numericKeys = keys.filter((k) => /^\d+$/.test(k));
    if (numericKeys.length > 0) {
      return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => data[k]);
    }

    // Handle single-question object shape
    const looksLikeQuestion =
      'question' in data ||
      'text' in data ||
      'content' in data ||
      'prompt' in data ||
      'stem' in data ||
      'options' in data ||
      'answers' in data ||
      'correctAnswer' in data ||
      'answer' in data;

    if (looksLikeQuestion) {
      return [data];
    }

    return [];
  }

  private buildQuestionsFallback(rawQuestions: any): any[] {
    const arr = this.coerceQuestionsArray(rawQuestions);
    if (arr.length === 0) return [];

    const toText = (value: any): string => {
      if (value === undefined || value === null) return '';
      if (typeof value === 'string') return value.trim();
      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
      return '';
    };

    return arr
      .map((item, idx) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const question =
            toText(item.question) ||
            toText(item.text) ||
            toText(item.content) ||
            toText(item.prompt) ||
            toText(item.stem);

          const options = Array.isArray(item.options)
            ? item.options.map((opt: any) => toText(opt)).filter(Boolean)
            : Array.isArray(item.answers)
              ? item.answers.map((opt: any) => toText(opt)).filter(Boolean)
              : [];

          const answer =
            toText(item.correctAnswer) ||
            toText(item.answer) ||
            toText(item.correct);

          if (!question && options.length === 0 && !answer) return null;

          return {
            id: toText(item.id) || `${idx + 1}`,
            type:
              toText(item.type) ||
              (options.length >= 2 ? 'multiple_choice' : 'fill_in'),
            question,
            image: toText(item.image) || undefined,
            options,
            correctAnswer: answer,
            points: Number(item.points) > 0 ? Number(item.points) : 1,
            explanation: toText(item.explanation),
          };
        }

        const asText = toText(item);
        if (!asText) return null;
        return {
          id: `${idx + 1}`,
          type: 'fill_in',
          question: asText,
          image: undefined,
          options: [],
          correctAnswer: '',
          points: 1,
          explanation: '',
        };
      })
      .filter((item) => item !== null);
  }

  private normalizeSingleQuestion(raw: any, index: number): any | null {
    const asString = (value: any): string => {
      if (value === undefined || value === null) return '';
      if (typeof value === 'string') return value.trim();
      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
      return '';
    };

    const optionToText = (option: any): string => {
      if (typeof option === 'string') return option.trim();
      if (typeof option === 'number' || typeof option === 'boolean') {
        return String(option);
      }
      if (!option || typeof option !== 'object') return '';
      return (
        asString(option.text) ||
        asString(option.label) ||
        asString(option.content) ||
        asString(option.value)
      );
    };

    const findFirstMeaningfulText = (source: any): string => {
      if (source === undefined || source === null) return '';
      if (typeof source === 'string') return source.trim();
      if (typeof source === 'number' || typeof source === 'boolean') {
        return String(source);
      }
      if (Array.isArray(source)) {
        for (const item of source) {
          const nested = findFirstMeaningfulText(item);
          if (nested) return nested;
        }
        return '';
      }
      if (typeof source !== 'object') return '';

      const preferredKeys = [
        'question',
        'questionText',
        'text',
        'content',
        'prompt',
        'stem',
        'title',
        'name',
      ];

      for (const key of preferredKeys) {
        const candidate = findFirstMeaningfulText(source[key]);
        if (candidate) return candidate;
      }

      const ignoredKeys = new Set([
        'id',
        'type',
        'questionType',
        'correctAnswer',
        'answer',
        'correct',
        'options',
        'answers',
        'points',
        'score',
        'mark',
        'weight',
        'image',
        'imageUrl',
      ]);

      for (const [key, value] of Object.entries(source)) {
        if (ignoredKeys.has(key)) continue;
        const nested = findFirstMeaningfulText(value);
        if (nested) return nested;
      }

      return '';
    };

    const cleanOptionText = (value: string): string => {
      return value
        .trim()
        .replace(/^[-*+•]\s*/, '')
        .replace(/^"+|"+$/g, '')
        .replace(/^“+|”+$/g, '')
        .trim();
    };

    const normalizeOptions = (options: string[]): string[] => {
      return options.map((item) => cleanOptionText(item)).filter(Boolean);
    };

    const mapAnswerToOption = (
      answer: any,
      options: string[],
    ): string | string[] => {
      const mapSingle = (value: any): string => {
        const token = String(value || '').trim();
        if (!token) return '';

        const letterMatch = token.match(/^[A-F]$/i);
        if (letterMatch) {
          const idx = letterMatch[0].toUpperCase().charCodeAt(0) - 65;
          return options[idx] || '';
        }

        const numeric = Number.parseInt(token, 10);
        if (!Number.isNaN(numeric)) {
          if (numeric >= 1 && numeric <= options.length)
            return options[numeric - 1];
          if (numeric >= 0 && numeric < options.length) return options[numeric];
        }

        const same = options.find(
          (option) => option.toLowerCase() === token.toLowerCase(),
        );
        return same || token;
      };

      if (Array.isArray(answer)) {
        return answer.map((item) => mapSingle(item)).filter(Boolean);
      }

      return mapSingle(answer);
    };

    const normalizeType = (
      value: any,
    ): 'multiple_choice' | 'true_false' | 'fill_in' => {
      const normalized = String(value || 'multiple_choice')
        .toLowerCase()
        .trim();
      if (['multiple-choice', 'multiple_choice', 'mcq'].includes(normalized)) {
        return 'multiple_choice';
      }
      if (['true-false', 'true_false', 'boolean'].includes(normalized)) {
        return 'true_false';
      }
      if (
        ['fill_in', 'fill-in', 'fill_blank', 'fillblank'].includes(normalized)
      ) {
        return 'fill_in';
      }
      return 'multiple_choice';
    };

    const parseFromArray = (arr: any[]): any | null => {
      const cells = arr.map((cell) => asString(cell));
      const question = cells[0] || '';
      if (!question) return null;

      const options = cells.slice(1, 7).filter(Boolean);
      const rawAnswer = cells[7] || cells[cells.length - 1] || '';
      const pointValue = Number(cells[8]);
      const points =
        Number.isFinite(pointValue) && pointValue > 0 ? pointValue : 1;
      const explanation = cells[9] || '';

      if (options.length >= 2) {
        return {
          id: `${index + 1}`,
          type:
            options.length === 2 &&
            options.includes('Đúng') &&
            options.includes('Sai')
              ? 'true_false'
              : 'multiple_choice',
          question,
          options,
          correctAnswer: rawAnswer || options[0],
          points,
          explanation,
          image: undefined,
        };
      }

      return {
        id: `${index + 1}`,
        type: 'fill_in',
        question,
        options: [],
        correctAnswer: rawAnswer,
        points,
        explanation,
        image: undefined,
      };
    };

    const resolveImage = (source: any): string => {
      if (!source || typeof source !== 'object') return '';
      return (
        asString(source.image) ||
        asString(source.imageUrl) ||
        asString(source.imageURL) ||
        asString(source.img) ||
        asString(source.url) ||
        asString(source.media?.url) ||
        ''
      );
    };

    let questionData = raw;
    if (typeof questionData === 'string') {
      try {
        questionData = JSON.parse(questionData);
      } catch {
        questionData = {
          question: questionData,
          type: 'fill_in',
          options: [],
          correctAnswer: '',
          points: 1,
        };
      }
    }

    if (Array.isArray(questionData)) {
      console.log(
        `[normalizeSingleQuestion] index=${index}, input is array, calling parseFromArray`,
      );
      return parseFromArray(questionData);
    }

    if (!questionData || typeof questionData !== 'object') {
      console.log(
        `[normalizeSingleQuestion] index=${index}, input is not object/array, returning NULL`,
      );
      return null;
    }

    const question =
      asString(questionData.question) ||
      asString(questionData.text) ||
      asString(questionData.content) ||
      asString(questionData.questionText) ||
      asString(questionData.prompt) ||
      asString(questionData.stem) ||
      findFirstMeaningfulText(questionData);
    const image = resolveImage(questionData);

    // Nếu có bất kỳ text nào, vẫn giữ lại câu hỏi (không trả về null)
    if (!question) {
      console.log(
        `[normalizeSingleQuestion] index=${index}, no question text found, checking options...`,
      );
      const options = Array.isArray(questionData.options)
        ? questionData.options
            .map((option) => optionToText(option))
            .filter(Boolean)
        : Array.isArray(questionData.answers)
          ? questionData.answers
              .map((option) => optionToText(option))
              .filter(Boolean)
          : [];
      const answerValue =
        questionData.correctAnswer ??
        questionData.answer ??
        questionData.correct ??
        '';
      const explanation =
        asString(questionData.explanation) || asString(questionData.explain);

      if (options.length > 0 || asString(answerValue) || image || explanation) {
        console.log(
          `[normalizeSingleQuestion] index=${index}, keeping partial question with preserved content`,
        );
        const normalizedOptions = normalizeOptions(options);
        const fallbackType =
          normalizedOptions.length >= 2 ? 'multiple_choice' : 'fill_in';
        return {
          ...questionData,
          id: asString(questionData.id) || `${index + 1}`,
          type: fallbackType,
          question: '',
          image: image || undefined,
          options: fallbackType === 'multiple_choice' ? normalizedOptions : [],
          correctAnswer:
            fallbackType === 'fill_in'
              ? asString(answerValue)
              : mapAnswerToOption(answerValue, normalizedOptions),
          points: 1,
          explanation,
        };
      }
      // Nếu không có text và không có option, trả về null
      console.log(
        `[normalizeSingleQuestion] index=${index}, no question text and no options, returning NULL`,
      );
      return null;
    }

    const options = Array.isArray(questionData.options)
      ? questionData.options
          .map((option) => optionToText(option))
          .filter(Boolean)
      : Array.isArray(questionData.answers)
        ? questionData.answers
            .map((option) => optionToText(option))
            .filter(Boolean)
        : [];

    console.log(
      `[normalizeSingleQuestion] index=${index}, type=${questionData.type}, question="${question.substring(0, 30)}...", options.length=${options.length}`,
    );

    let effectiveQuestion = question;
    let effectiveOptions = options;

    if (effectiveOptions.length < 2 && effectiveQuestion.includes('\n')) {
      const lines = effectiveQuestion
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length >= 3) {
        const stem = lines[0];
        const inferredOptions = lines
          .slice(1)
          .map((line) => cleanOptionText(line.replace(/^[A-F][.)]\s*/i, '')))
          .filter(Boolean);

        if (inferredOptions.length >= 2) {
          effectiveQuestion = stem;
          effectiveOptions = inferredOptions;
        }
      }
    }

    const type = normalizeType(questionData.type || questionData.questionType);
    const pointsValue = Number(
      questionData.points ?? questionData.score ?? questionData.mark,
    );
    const points =
      Number.isFinite(pointsValue) && pointsValue > 0 ? pointsValue : 1;
    const explanation =
      asString(questionData.explanation) || asString(questionData.explain);

    const correctAnswer =
      questionData.correctAnswer ??
      questionData.answer ??
      questionData.correct ??
      '';

    const normalizedType = effectiveOptions.length >= 2 ? type : 'fill_in';
    const finalOptions =
      normalizedType === 'multiple_choice'
        ? normalizeOptions(effectiveOptions)
        : normalizedType === 'true_false'
          ? normalizeOptions(
              effectiveOptions.length >= 2
                ? effectiveOptions.slice(0, 2)
                : ['Đúng', 'Sai'],
            )
          : [];
    const mappedAnswer =
      normalizedType === 'fill_in'
        ? asString(correctAnswer)
        : mapAnswerToOption(correctAnswer, finalOptions);

    const normalized = {
      ...questionData,
      id: asString(questionData.id) || `${index + 1}`,
      type: normalizedType,
      question: effectiveQuestion,
      image: image || undefined,
      options: finalOptions,
      correctAnswer: mappedAnswer,
      points,
      explanation,
    };

    console.log(
      `[normalizeSingleQuestion] index=${index}, question="${effectiveQuestion.substring(0, 50)}", type=${normalizedType}, options=${finalOptions.length}, returning=`,
      normalized ? 'object' : 'null',
    );

    return normalized;
  }
}
