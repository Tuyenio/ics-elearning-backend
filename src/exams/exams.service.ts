/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-enum-comparison, @typescript-eslint/no-redundant-type-constituents */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
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
  private readonly logger = new Logger(ExamsService.name);

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

  private debugLog(...args: unknown[]): void {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(args.map((item) => this.safeStringify(item)).join(' '));
    }
  }

  private safeStringify(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

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

    this.debugLog(
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
        this.debugLog('[create] Detected array type for question item');
        this.debugLog('[create] First item Array.length:', firstItem.length);
        this.debugLog(
          '[create] First item Object.keys:',
          Object.keys(firstItem),
        );

        // If it's an empty array with properties, extract the properties as question objects
        if (firstItem.length === 0 && Object.keys(firstItem).length > 0) {
          this.debugLog(
            '[create] Array has properties but no numeric indices - extracting objects',
          );
          questionsToSave = questionsToSave.map((item) => {
            const obj: any = {};
            for (const key of Object.keys(item)) {
              obj[key] = item[key];
            }
            return obj;
          });
          this.debugLog(
            '[create] After extraction: length =',
            questionsToSave.length,
          );
        } else if (firstItem.length > 0) {
          // If it's a proper array with items, just flatten it
          this.debugLog('[create] Array has numeric indices - flattening');
          questionsToSave = questionsToSave.flat();
          this.debugLog(
            '[create] After flatten: length =',
            questionsToSave.length,
          );
        }
      }
    }

    const requestedStatus = String(createExamDto?.status || '').toLowerCase();
    const isTeacher = role === UserRole.TEACHER;

    if (
      isTeacher &&
      requestedStatus &&
      ![ExamStatus.DRAFT, ExamStatus.PENDING].includes(
        requestedStatus as ExamStatus,
      )
    ) {
      throw new BadRequestException(
        'Giảng viên chỉ được lưu nháp hoặc gửi chờ duyệt',
      );
    }

    const effectiveStatus = isTeacher
      ? requestedStatus === ExamStatus.PENDING
        ? ExamStatus.PENDING
        : ExamStatus.DRAFT
      : [ExamStatus.DRAFT, ExamStatus.PENDING, ExamStatus.APPROVED, ExamStatus.REJECTED].includes(
            requestedStatus as ExamStatus,
          )
        ? (requestedStatus as ExamStatus)
        : ExamStatus.APPROVED;

    const examData = {
      ...createExamDto,
      questions: questionsToSave,
      teacherId,
      status: effectiveStatus,
      rejectionReason: null,
    };

    this.debugLog(
      '[create] examData.questions sample (first 2):',
      examData.questions?.slice(0, 2),
    );

    // Log the structure of first question to debug serialization
    if (examData.questions && examData.questions.length > 0) {
      const firstQuestion = examData.questions[0];
      this.debugLog('[create] First question structure:', {
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
    this.debugLog(
      '[create] exam.questions before save first 2:',
      (exam.questions as any[])?.slice(0, 2),
    );
    this.debugLog(
      '[create] exam.questions.length:',
      (exam.questions as any[])?.length,
    );

    if ((exam.questions as any[])?.length > 0) {
      const firstQuestion = (exam.questions as any[])[0];
      this.debugLog('[create] First question before save:', firstQuestion);
    }

    const saved = await this.examRepository.save(exam);

    // Log after save
    this.debugLog(
      '[create] saved.questions.length after save:',
      (saved.questions as any[])?.length,
    );
    if ((saved.questions as any[])?.length > 0) {
      this.debugLog(
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

    if (
      metaFields.status &&
      ![ExamStatus.DRAFT, ExamStatus.PENDING].includes(
        metaFields.status as ExamStatus,
      )
    ) {
      throw new BadRequestException(
        'Giảng viên chỉ được lưu nháp hoặc gửi chờ duyệt',
      );
    }

    if (metaFields.status) {
      metaFields.rejectionReason = null;
    }

    if (rawQuestions !== undefined) {
      const normalizedQuestions = this.normalizeQuestionsPayload(rawQuestions);
      const fallbackQuestions = this.buildQuestionsFallback(rawQuestions);
      const hasRawQuestionContent = this.hasAnyQuestionContent(rawQuestions);
      const rawArray = this.coerceQuestionsArray(rawQuestions);
      const existingQuestions = this.coerceQuestionsArray(exam.questions);
      const targetStatus =
        (metaFields.status as ExamStatus | undefined) || exam.status;
      let rawPreserved: any = rawQuestions;
      while (typeof rawPreserved === 'string') {
        try {
          rawPreserved = JSON.parse(rawPreserved);
        } catch {
          break;
        }
      }
      let finalQuestions =
        rawArray.length > 0
          ? rawArray
          : normalizedQuestions.length > 0
            ? normalizedQuestions
            : fallbackQuestions.length > 0
              ? fallbackQuestions
              : hasRawQuestionContent
                ? rawPreserved && typeof rawPreserved === 'object'
                  ? rawPreserved
                  : []
                : [];

      // Draft saves should preserve in-progress question editing data.
      if (targetStatus === ExamStatus.DRAFT) {
        const draftPayload =
          rawArray.length > 0
            ? rawArray
            : rawPreserved && typeof rawPreserved === 'object'
              ? rawPreserved
              : finalQuestions;
        finalQuestions = draftPayload;
      } else if (targetStatus === ExamStatus.PENDING) {
        const prepared = this.prepareValidQuestionsForReview(finalQuestions);
        if (prepared.validQuestions.length === 0) {
          throw new BadRequestException(
            'Không có câu hỏi hợp lệ để gửi duyệt. Vui lòng kiểm tra nội dung, đáp án và tùy chọn.',
          );
        }
      }

      // Guardrail: never wipe question bank on teacher edit when prior data exists.
      if (
        Array.isArray(finalQuestions) &&
        finalQuestions.length === 0 &&
        existingQuestions.length > 0
      ) {
        this.debugLog(
          '[update] Prevented empty overwrite, preserving existing questions for exam',
          id,
          'existing=',
          existingQuestions.length,
        );
        finalQuestions = existingQuestions;
      }
      this.debugLog(
        '[update] Saving',
        normalizedQuestions.length,
        'normalized /',
        fallbackQuestions.length,
        'fallback /',
        finalQuestions.length,
        'final questions for exam',
        id,
      );
      if (hasRawQuestionContent && finalQuestions.length === 0) {
        this.debugLog(
          '[update] WARNING: raw questions has content but finalQuestions is empty for exam',
          id,
        );
      }
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

    if (
      metaFields.status &&
      ![ExamStatus.DRAFT, ExamStatus.PENDING, ExamStatus.APPROVED, ExamStatus.REJECTED].includes(
        metaFields.status as ExamStatus,
      )
    ) {
      throw new BadRequestException('Trạng thái bài thi không hợp lệ');
    }

    if (metaFields.status) {
      metaFields.rejectionReason = null;
    }

    if (rawQuestions !== undefined) {
      const normalizedQuestions = this.normalizeQuestionsPayload(rawQuestions);
      const fallbackQuestions = this.buildQuestionsFallback(rawQuestions);
      const hasRawQuestionContent = this.hasAnyQuestionContent(rawQuestions);
      const rawArray = this.coerceQuestionsArray(rawQuestions);
      const targetStatus =
        (metaFields.status as ExamStatus | undefined) || exam.status;
      let rawPreserved: any = rawQuestions;
      while (typeof rawPreserved === 'string') {
        try {
          rawPreserved = JSON.parse(rawPreserved);
        } catch {
          break;
        }
      }
      let finalQuestions =
        rawArray.length > 0
          ? rawArray
          : normalizedQuestions.length > 0
            ? normalizedQuestions
            : fallbackQuestions.length > 0
              ? fallbackQuestions
              : hasRawQuestionContent
                ? rawPreserved && typeof rawPreserved === 'object'
                  ? rawPreserved
                  : []
                : [];

      if (targetStatus === ExamStatus.DRAFT) {
        const draftPayload =
          rawArray.length > 0
            ? rawArray
            : rawPreserved && typeof rawPreserved === 'object'
              ? rawPreserved
              : finalQuestions;
        finalQuestions = draftPayload;
      } else if (targetStatus === ExamStatus.PENDING) {
        const prepared = this.prepareValidQuestionsForReview(finalQuestions);
        if (prepared.validQuestions.length === 0) {
          throw new BadRequestException(
            'Không có câu hỏi hợp lệ để gửi duyệt. Vui lòng kiểm tra nội dung, đáp án và tùy chọn.',
          );
        }
      }
      this.debugLog(
        '[updateAny] raw type:',
        typeof rawQuestions,
        'normalized:',
        normalizedQuestions.length,
        'fallback:',
        fallbackQuestions.length,
        'final:',
        finalQuestions.length,
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
    const prepared = this.prepareValidQuestionsForReview(questionsArray);
    this.debugLog(
      '[submitForApproval] exam:',
      id,
      'questionsArray.length/raw:',
      questionsArray.length,
      'valid:',
      prepared.validQuestions.length,
      'sample:',
      questionsArray.slice(0, 1),
    );

    if (prepared.validQuestions.length === 0) {
      throw new BadRequestException(
        'Bài thi chưa có câu hỏi hợp lệ để gửi duyệt',
      );
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

    console.log(
      `[SubmitExam] Processing exam submission. ExamID: ${exam.id}, Type: ${exam.type}, Passed: ${passed}`,
    );

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

    // Issue certificate if exam passed and is official exam type
    if (savedAttempt.passed && exam.type === ExamType.OFFICIAL) {
      try {
        console.log(
          `[Certificate] Student ${studentId} passed official exam ${exam.id}. Looking for enrollment for course ${exam.courseId}`,
        );

        const enrollment = await this.enrollmentRepository.findOne({
          where: { studentId, courseId: exam.courseId },
          relations: ['student', 'course'],
        });

        if (enrollment) {
          try {
            console.log(
              `[Certificate] Found enrollment ${enrollment.id}. Generating certificate...`,
            );

            const certificate =
              await this.certificatesService.generateCertificateForExamPass(
                enrollment.id,
                {
                  examId: exam.id,
                  score: savedAttempt.score,
                  attemptId: savedAttempt.id,
                },
              );

            console.log(
              `[Certificate] Certificate ${certificate.id} created successfully for attempt ${savedAttempt.id}`,
            );

            savedAttempt.certificateIssued = true;
            savedAttempt.certificateId = certificate.id;
            const finalAttempt = await this.attemptRepository.save(savedAttempt);

            console.log(
              `[Certificate] Attempt updated with certificateId: ${finalAttempt.certificateId}`,
            );

            return finalAttempt;
          } catch (certError) {
            console.error(
              `[Certificate] Error generating certificate for enrollment ${enrollment.id}:`,
              certError instanceof Error ? certError.message : certError,
            );
            // Still return the attempt even if certificate generation fails
            // The student passed the exam, certificate can be retried later
          }
        } else {
          console.warn(
            `[Certificate] No enrollment found for studentId: ${studentId}, courseId: ${exam.courseId}`,
          );
        }
      } catch (error) {
        console.error(
          `[Certificate] Error in certificate issuance process:`,
          error instanceof Error ? error.message : error,
        );
        // Continue without certificate - student still passed the exam
      }
    }

    console.log(
      `[Attempt] Returning attempt ${savedAttempt.id} with certificateIssued=${savedAttempt.certificateIssued}, certificateId=${savedAttempt.certificateId}`,
    );
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

    // Best-effort auto issuance: if student passed an official exam but certificate is still missing,
    // trigger the retry flow during result fetch so polling/manual refresh can recover automatically.
    if (attempt.passed && attempt.exam.type === ExamType.OFFICIAL && !attempt.certificateId) {
      try {
        const retried = await this.retryIssueCertificate(attemptId, studentId);
        return retried;
      } catch (error) {
        console.warn(
          `[GetAttemptResult] Auto retry certificate failed for attempt ${attemptId}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    return attempt;
  }

  async retryIssueCertificate(
    attemptId: string,
    studentId: string,
  ): Promise<ExamAttempt> {
    console.log(
      `[RetryCertificate] Student ${studentId} requesting certificate retry for attempt ${attemptId}`,
    );

    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, studentId },
      relations: ['exam', 'exam.course'],
    });

    if (!attempt) {
      throw new NotFoundException('Không tìm thấy bài làm');
    }

    if (!attempt.passed) {
      throw new BadRequestException('Bạn chưa đạt để nhận chứng chỉ');
    }

    if (attempt.exam.type !== ExamType.OFFICIAL) {
      throw new BadRequestException('Bài thi này không phát hành chứng chỉ');
    }

    if (attempt.certificateId) {
      console.log(
        `[RetryCertificate] Certificate already exists: ${attempt.certificateId}`,
      );
      return attempt;
    }

    // Try to issue certificate
    try {
      const enrollment = await this.enrollmentRepository.findOne({
        where: { studentId, courseId: attempt.exam.courseId },
        relations: ['student', 'course'],
      });

      if (!enrollment) {
        throw new NotFoundException(
          `Enrollment not found for student ${studentId} in course ${attempt.exam.courseId}`,
        );
      }

      console.log(`[RetryCertificate] Retrying certificate generation...`);

      const certificate =
        await this.certificatesService.generateCertificateForExamPass(
          enrollment.id,
          {
            examId: attempt.exam.id,
            score: attempt.score,
            attemptId: attempt.id,
          },
        );

      attempt.certificateId = certificate.id;
      attempt.certificateIssued = true;

      const updated = await this.attemptRepository.save(attempt);
      console.log(`[RetryCertificate] Certificate issued: ${certificate.id}`);
      return updated;
    } catch (error) {
      console.error(`[RetryCertificate] Error:`, error);
      throw error;
    }
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

    this.debugLog(
      '[normalizeQuestionsPayload] Processing',
      questionsArray.length,
      'raw questions',
    );
    const normalized = questionsArray
      .map((raw, index) => {
        const result = this.normalizeSingleQuestion(raw, index);
        this.debugLog(
          `[normalizeQuestionsPayload] Question ${index}: ${result ? 'kept' : 'filtered'}`,
        );
        return result;
      })
      .filter((item) => item !== null);

    this.debugLog(
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
      this.debugLog(
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
    this.debugLog(
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
        this.debugLog(
          '[coerceQuestionsArray] Failed to parse string questions:',
          e instanceof Error ? e.message : String(e),
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

    // Fallback for object maps like { q1: {...}, q2: {...} }
    const objectValues = Object.values(data).filter(
      (item) => item !== undefined && item !== null,
    );
    if (objectValues.length > 0) {
      return objectValues;
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

  private prepareValidQuestionsForReview(
    rawQuestions: any,
  ): { validQuestions: any[]; invalidCount: number } {
    const normalizedPrimary = this.normalizeQuestionsPayload(rawQuestions);
    let normalized = normalizedPrimary;

    // Fallback for edge shapes that primary normalization may over-filter.
    if (normalized.length === 0) {
      normalized = this.buildQuestionsFallback(rawQuestions);
    }

    const validQuestions = normalized.filter((q) =>
      this.isQuestionValidForSubmission(q),
    );

    this.debugLog(
      '[prepareValidQuestionsForReview] primary=',
      normalizedPrimary.length,
      'normalized=',
      normalized.length,
      'valid=',
      validQuestions.length,
    );

    return {
      validQuestions,
      invalidCount: Math.max(0, normalized.length - validQuestions.length),
    };
  }

  private isQuestionValidForSubmission(question: any): boolean {
    if (!question || typeof question !== 'object') return false;

    const text = String(
      question.question ||
        question.questionText ||
        question.text ||
        question.content ||
        question.prompt ||
        question.stem ||
        '',
    ).trim();
    if (!text) return false;

    const type = String(question.type || question.questionType || 'multiple_choice').toLowerCase();
    const options = Array.isArray(question.options)
      ? question.options
          .map((item: any) => String(item || '').trim())
          .filter(Boolean)
      : Array.isArray(question.answers)
        ? question.answers
            .map((item: any) => String(item || '').trim())
            .filter(Boolean)
      : [];

    const answer =
      question.correctAnswer ??
      question.correct_answer ??
      question.answer ??
      question.correct ??
      question.correctAnswers;
    const normalizeAnswerToken = (value: any): string =>
      String(value || '')
        .trim()
        .toLowerCase();

    const normalizedOptionTokens = (
      options.length > 0 ? options : ['Đúng', 'Sai']
    ).map((item) => normalizeAnswerToken(item));

    const hasOptionMatch = (value: any): boolean => {
      const token = normalizeAnswerToken(value);
      if (!token) return false;

      if (normalizedOptionTokens.includes(token)) return true;

      // Support A/B/C... or numeric answer indices.
      const letterMatch = token.match(/^[a-f]$/i);
      if (letterMatch) {
        const idx = letterMatch[0].toUpperCase().charCodeAt(0) - 65;
        return idx >= 0 && idx < normalizedOptionTokens.length;
      }

      const numeric = /^\d+$/.test(token) ? Number.parseInt(token, 10) : NaN;
      if (!Number.isNaN(numeric)) {
        if (numeric >= 1 && numeric <= normalizedOptionTokens.length) return true;
        if (numeric >= 0 && numeric < normalizedOptionTokens.length) return true;
      }

      return false;
    };

    if (type === 'fill_in') {
      return String(answer || '').trim().length > 0;
    }

    if (type === 'true_false') {
      const answerToken = normalizeAnswerToken(answer);
      if (!answerToken) return false;
      if (['đúng', 'sai', 'true', 'false'].includes(answerToken)) return true;
      return hasOptionMatch(answer) || options.length >= 2;
    }

    // multiple_choice or fallback
    if (options.length < 2) return false;
    if (Array.isArray(answer)) {
      const nonEmpty = answer
        .map((item) => String(item || '').trim())
        .filter(Boolean);
      return nonEmpty.length > 0;
    }

    const answerText = String(answer || '').trim();
    if (!answerText) return false;

    // Keep permissive here to avoid false negatives from mixed answer formats.
    return hasOptionMatch(answer) || answerText.length > 0;
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
      this.debugLog(
        `[normalizeSingleQuestion] index=${index}, input is array, calling parseFromArray`,
      );
      return parseFromArray(questionData);
    }

    if (!questionData || typeof questionData !== 'object') {
      this.debugLog(
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
      this.debugLog(
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
        this.debugLog(
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
      this.debugLog(
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

    this.debugLog(
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

    this.debugLog(
      `[normalizeSingleQuestion] index=${index}, question="${effectiveQuestion.substring(0, 50)}", type=${normalizedType}, options=${finalOptions.length}, returning=`,
      normalized ? 'object' : 'null',
    );

    return normalized;
  }
}
