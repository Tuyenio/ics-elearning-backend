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
  ExamVariant,
  ExtractedExamQuestion,
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
import { ExtractedExamAttempt } from './entities/extracted-exam-attempt.entity';

type StudentAnswerPayload = { questionId: string; answer: string | string[] };

type QuestionResult = {
  id: string;
  type: ExtractedExamQuestion['type'];
  question: string;
  image?: string;
  options: string[];
  userAnswer: string | string[] | undefined;
  correctAnswer: string | string[];
  explanation?: string;
  isCorrect: boolean;
};

type NormalizedQuestion = ExtractedExamQuestion & { options: string[] };

const STATUS_MAP: Record<ExtractedExamStatusDto, ExtractedExamStatus> = {
  [ExtractedExamStatusDto.DRAFT]: ExtractedExamStatus.DRAFT,
  [ExtractedExamStatusDto.PENDING]: ExtractedExamStatus.PENDING,
  [ExtractedExamStatusDto.APPROVED]: ExtractedExamStatus.APPROVED,
  [ExtractedExamStatusDto.REJECTED]: ExtractedExamStatus.REJECTED,
};

const TYPE_MAP: Record<ExtractedExamTypeDto, ExtractedExamType> = {
  [ExtractedExamTypeDto.PRACTICE]: ExtractedExamType.PRACTICE,
  [ExtractedExamTypeDto.OFFICIAL]: ExtractedExamType.OFFICIAL,
};

@Injectable()
export class ExtractedExamsService {
  constructor(
    @InjectRepository(ExtractedExam)
    private readonly extractedExamRepo: Repository<ExtractedExam>,
    @InjectRepository(ExtractedExamAttempt)
    private readonly extractedExamAttemptRepo: Repository<ExtractedExamAttempt>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
  ) {}

  private shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Create `count` exam variants from the question pool.
   *  Each variant has the same questions in a different random order;
   *  variant codes start at 101. */
  private generateVariants(
    questions: NormalizedQuestion[],
    count: number,
  ): ExamVariant[] {
    if (!questions.length || count <= 1) return [];
    const variants: ExamVariant[] = [];
    for (let i = 0; i < count; i++) {
      variants.push({
        code: 101 + i,
        questions: this.shuffleArray(questions),
      });
    }
    return variants;
  }

  private normalizeStatus(
    status?: ExtractedExamStatusDto,
  ): ExtractedExamStatus {
    if (!status) return ExtractedExamStatus.APPROVED;
    return STATUS_MAP[status] ?? ExtractedExamStatus.APPROVED;
  }

  private normalizeType(type?: ExtractedExamTypeDto): ExtractedExamType {
    if (!type) return ExtractedExamType.PRACTICE;
    return TYPE_MAP[type] ?? ExtractedExamType.PRACTICE;
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
    const normalizedQuestions = this.normalizeQuestionsPayload(dto.questions);
    if (normalizedQuestions.length === 0) {
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

    const variantCount = Math.max(1, Number(dto.variantCount) || 1);
    const variants =
      variantCount > 1
        ? this.generateVariants(normalizedQuestions, variantCount)
        : [];

    const payload: Partial<ExtractedExam> = {
      ...dto,
      questions: normalizedQuestions,
      availableFrom,
      availableUntil,
      teacherId,
      variantCount,
      variants: variants.length > 0 ? variants : null,
      status: this.normalizeStatus(dto.status),
      type: this.normalizeType(dto.type),
    };

    const entity = this.extractedExamRepo.create(payload as ExtractedExam);
    return this.extractedExamRepo.save(entity);
  }

  async findMy(teacherId: string) {
    const exams = await this.extractedExamRepo.find({
      where: { teacherId },
      order: { createdAt: 'DESC' },
    });

    if (exams.length === 0) {
      return exams;
    }

    const examIds = exams.map((exam) => exam.id);
    const rawCounts = await this.extractedExamAttemptRepo
      .createQueryBuilder('attempt')
      .select('attempt.extractedExamId', 'examId')
      .addSelect('COUNT(*)', 'count')
      .where('attempt.extractedExamId IN (:...examIds)', { examIds })
      .groupBy('attempt.extractedExamId')
      .getRawMany<{ examId: string; count: string }>();

    const countMap = new Map(
      rawCounts.map((row) => [row.examId, Number(row.count) || 0]),
    );

    return exams.map((exam) => ({
      ...exam,
      attemptCount: countMap.get(exam.id) || 0,
    }));
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
    const nextQuestions = dto.questions
      ? this.normalizeQuestionsPayload(dto.questions)
      : undefined;

    if (dto.questions && (!nextQuestions || nextQuestions.length === 0)) {
      throw new BadRequestException('Cần ít nhất 1 câu hỏi');
    }

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

    const nextVariantCount =
      dto.variantCount !== undefined
        ? Math.max(1, Number(dto.variantCount))
        : undefined;
    const effectiveVariantCount = nextVariantCount ?? exam.variantCount ?? 1;
    const normalizedQuestionsForVariants =
      nextQuestions ?? this.normalizeQuestionsPayload(exam.questions ?? []);
    const shouldRegenerateVariants =
      nextQuestions !== undefined || nextVariantCount !== undefined;
    const nextVariants = shouldRegenerateVariants
      ? effectiveVariantCount > 1
        ? this.generateVariants(
            normalizedQuestionsForVariants,
            effectiveVariantCount,
          )
        : []
      : undefined;

    const updatePayload: Partial<ExtractedExam> = {
      ...dto,
      ...(nextQuestions ? { questions: nextQuestions } : {}),
      status: nextStatus ?? exam.status,
      type: nextType ?? exam.type,
      ...(nextVariantCount !== undefined
        ? { variantCount: effectiveVariantCount }
        : {}),
      ...(nextVariants !== undefined
        ? { variants: nextVariants.length > 0 ? nextVariants : null }
        : {}),
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

    // If exam has multiple variants, assign/re-use a variant code for this student
    if (exam.variants && exam.variants.length > 0) {
      const existingAttempt = await this.extractedExamAttemptRepo.findOne({
        where: { extractedExamId: exam.id, studentId },
        order: { createdAt: 'DESC' },
      });

      let variantCode: number;
      if (existingAttempt?.variantCode) {
        variantCode = existingAttempt.variantCode;
      } else {
        const randomIndex = Math.floor(Math.random() * exam.variants.length);
        variantCode = exam.variants[randomIndex].code;
      }

      const matchedVariant = exam.variants.find((v) => v.code === variantCode);
      if (matchedVariant) {
        return {
          ...exam,
          questions: matchedVariant.questions,
          assignedVariantCode: variantCode,
        };
      }
    }

    return exam;
  }

  async submitForStudent(
    id: string,
    studentId: string,
    answers: StudentAnswerPayload[],
    variantCode?: number,
  ) {
    const exam = await this.findOneForStudent(id, studentId);

    // Determine which questions to grade against
    let questions: NormalizedQuestion[];
    let resolvedVariantCode: number | null = null;
    if (variantCode && exam.variants && exam.variants.length > 0) {
      const variant = exam.variants.find((v) => v.code === variantCode);
      if (variant) {
        questions = this.normalizeQuestionsPayload(variant.questions);
        resolvedVariantCode = variantCode;
      } else {
        questions = this.normalizeQuestionsPayload(exam.questions);
      }
    } else {
      questions = this.normalizeQuestionsPayload(exam.questions);
    }

    const attemptCount = await this.extractedExamAttemptRepo.count({
      where: { extractedExamId: id, studentId },
    });

    if (attemptCount >= Number(exam.maxAttempts || 0)) {
      throw new BadRequestException(
        `Bạn đã sử dụng hết ${exam.maxAttempts} lần thi`,
      );
    }

    const submittedAt = new Date();

    let earnedPoints = 0;
    const totalPoints = questions.reduce(
      (sum, q) => sum + Number(q.points || 0),
      0,
    );

    const questionResults: QuestionResult[] = questions.map((question) => {
      const answer = answers.find((a) => a.questionId === question.id);
      const userAnswer = answer?.answer;
      const isCorrect = this.checkAnswer(question.correctAnswer, userAnswer);
      const points = isCorrect ? Number(question.points || 0) : 0;
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

    const savedAttempt = await this.extractedExamAttemptRepo.save(
      this.extractedExamAttemptRepo.create({
        extractedExamId: id,
        studentId,
        answers,
        questionResults,
        score,
        passed,
        earnedPoints,
        totalPoints,
        submittedAt,
        timeSpent: 0,
        variantCode: resolvedVariantCode,
      }),
    );

    const totalAttempts = Number(exam.maxAttempts || 0);
    const remainingAttempts = Math.max(0, totalAttempts - (attemptCount + 1));

    return {
      id: savedAttempt.id,
      score,
      passed,
      earnedPoints,
      totalPoints,
      certificateId: null,
      totalAttempts,
      remainingAttempts,
      exam: {
        id: exam.id,
        title: exam.title,
        passingScore: exam.passingScore,
        type: exam.type,
      },
      questionResults,
    };
  }

  async getAttemptsForTeacher(id: string, teacherId: string, role: UserRole) {
    const exam = await this.extractedExamRepo.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!exam) {
      throw new NotFoundException('Không tìm thấy đề thi');
    }

    if (role !== UserRole.ADMIN && exam.teacherId !== teacherId) {
      throw new BadRequestException(
        'Bạn không có quyền xem lượt làm của đề thi này',
      );
    }

    const attempts = await this.extractedExamAttemptRepo.find({
      where: { extractedExamId: id },
      relations: ['student'],
      order: { submittedAt: 'DESC', createdAt: 'DESC' },
    });

    return attempts.map((attempt) => ({
      id: attempt.id,
      extractedExamId: attempt.extractedExamId,
      studentId: attempt.studentId,
      student: attempt.student
        ? {
            id: attempt.student.id,
            name: attempt.student.name,
            email: attempt.student.email,
            avatar: attempt.student.avatar,
          }
        : null,
      score: attempt.score,
      passed: attempt.passed,
      earnedPoints: attempt.earnedPoints,
      totalPoints: attempt.totalPoints,
      variantCode: attempt.variantCode ?? null,
      questionResults: attempt.questionResults ?? [],
      submittedAt: attempt.submittedAt,
      createdAt: attempt.createdAt,
    }));
  }

  async getAttemptDetailForTeacher(
    examId: string,
    attemptId: string,
    teacherId: string,
    role: UserRole,
  ) {
    const exam = await this.extractedExamRepo.findOne({
      where: { id: examId },
    });
    if (!exam) throw new NotFoundException('Không tìm thấy đề thi');
    if (role !== UserRole.ADMIN && exam.teacherId !== teacherId) {
      throw new BadRequestException(
        'Bạn không có quyền xem chi tiết lượt thi này',
      );
    }

    const attempt = await this.extractedExamAttemptRepo.findOne({
      where: { id: attemptId, extractedExamId: examId },
      relations: ['student'],
    });
    if (!attempt) throw new NotFoundException('Không tìm thấy lượt thi');

    return {
      id: attempt.id,
      extractedExamId: attempt.extractedExamId,
      studentId: attempt.studentId,
      student: attempt.student
        ? {
            id: attempt.student.id,
            name: attempt.student.name,
            email: attempt.student.email,
            avatar: attempt.student.avatar,
          }
        : null,
      score: attempt.score,
      passed: attempt.passed,
      earnedPoints: attempt.earnedPoints,
      totalPoints: attempt.totalPoints,
      variantCode: attempt.variantCode ?? null,
      questionResults: attempt.questionResults ?? [],
      answers: attempt.answers ?? [],
      submittedAt: attempt.submittedAt,
      createdAt: attempt.createdAt,
    };
  }

  private checkAnswer(
    correctAnswer: string | string[],
    userAnswer: string | string[] | undefined,
  ): boolean {
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

  private normalizeQuestionsPayload(
    rawQuestions: unknown,
  ): NormalizedQuestion[] {
    const questionsArray = this.coerceQuestionsArray(rawQuestions);
    return questionsArray
      .map((question, index) => this.normalizeSingleQuestion(question, index))
      .filter((question): question is NormalizedQuestion => question !== null);
  }

  private coerceQuestionsArray(rawQuestions: unknown): unknown[] {
    let data = rawQuestions;

    while (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return [];
      }
    }

    if (Array.isArray(data)) {
      return data;
    }

    if (!data || typeof data !== 'object') {
      return [];
    }

    const keys = Object.keys(data as Record<string, unknown>);
    const numericKeys = keys.filter((key) => /^\d+$/.test(key));
    if (numericKeys.length > 0) {
      return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => (data as Record<string, unknown>)[key]);
    }

    const dataWithQuestions = data as { questions?: unknown };
    if (Array.isArray(dataWithQuestions.questions)) {
      return dataWithQuestions.questions;
    }

    return [data];
  }

  private normalizeSingleQuestion(
    rawQuestion: unknown,
    index: number,
  ): NormalizedQuestion | null {
    if (!rawQuestion || typeof rawQuestion !== 'object') {
      return null;
    }

    const record = rawQuestion as Record<string, unknown>;

    const toText = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') return value.trim();
      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
      return '';
    };

    const normalizeCorrectAnswer = (value: unknown): string | string[] => {
      if (Array.isArray(value)) {
        const values = value.map((entry) => toText(entry)).filter(Boolean);
        return values.length > 0 ? values : '';
      }

      return toText(value);
    };

    const options = Array.isArray(record.options)
      ? record.options.map((option) => toText(option)).filter(Boolean)
      : Array.isArray((record as { answers?: unknown[] }).answers)
        ? (record as { answers: unknown[] }).answers
            .map((option) => toText(option))
            .filter(Boolean)
        : [];

    const questionText =
      toText(record.question) ||
      toText((record as { text?: unknown }).text) ||
      toText((record as { questionText?: unknown }).questionText) ||
      toText((record as { content?: unknown }).content) ||
      toText((record as { prompt?: unknown }).prompt) ||
      toText((record as { stem?: unknown }).stem);

    if (!questionText && options.length === 0) {
      return null;
    }

    const rawTypeValue = (record as { type?: unknown }).type;
    const rawType =
      typeof rawTypeValue === 'string' ? rawTypeValue.toLowerCase().trim() : '';
    const type =
      rawType === 'true_false' || rawType === 'true-false'
        ? 'true_false'
        : rawType === 'fill_in' || rawType === 'fill-in'
          ? 'fill_in'
          : 'multiple_choice';

    const rawCorrectAnswer =
      (record as { correctAnswer?: unknown }).correctAnswer ??
      (record as { answer?: unknown }).answer ??
      (record as { correct?: unknown }).correct;

    return {
      id: toText(record.id) || `q-${index + 1}`,
      type,
      question: questionText,
      image:
        toText(record.image) ||
        toText((record as { imageUrl?: unknown }).imageUrl) ||
        undefined,
      options,
      correctAnswer: normalizeCorrectAnswer(rawCorrectAnswer),
      points:
        Number((record as { points?: unknown }).points) > 0
          ? Number((record as { points?: unknown }).points)
          : 1,
      explanation:
        toText((record as { explanation?: unknown }).explanation) || '',
      chapter: toText((record as { chapter?: unknown }).chapter) || undefined,
      difficulty: (record as { difficulty?: unknown }).difficulty as
        | number
        | string
        | undefined,
    };
  }
}
