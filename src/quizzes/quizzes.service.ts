import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz } from './entities/quiz.entity';
import { QuizAttempt, AttemptStatus } from './entities/quiz-attempt.entity';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { QuizQuestion } from './entities/quiz-question.entity';
import { QuizAnswer } from './entities/quiz-answer.entity';

type QuestionBankItem = {
  id?: string;
  question: string;
  content?: string;
  contentHtml?: string;
  content_html?: string;
  image?: string;
  difficulty?: number;
  topic?: string;
  learningObj?: string;
  globalObj?: string;
  type: string;
  options: string[];
  correctAnswer?: number;
  correctAnswers?: number[];
  answers?: Array<{
    id?: string;
    question_id?: string;
    content: string;
    is_correct: boolean;
    isCorrect: boolean;
  }>;
};

type NormalizedIncomingQuestion = {
  contentHtml: string;
  image?: string;
  difficulty?: number;
  topic?: string;
  learningObj?: string;
  globalObj?: string;
  type: string;
  options: string[];
  correctAnswerIndices: number[];
};

@Injectable()
export class QuizzesService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    @InjectRepository(QuizAttempt)
    private readonly attemptRepository: Repository<QuizAttempt>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(QuizQuestion)
    private readonly quizQuestionRepository: Repository<QuizQuestion>,
    @InjectRepository(QuizAnswer)
    private readonly quizAnswerRepository: Repository<QuizAnswer>,
  ) {}

  async create(createQuizDto: CreateQuizDto, user: User): Promise<any> {
    const course = await this.courseRepository.findOne({
      where: { id: createQuizDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tìm thấy');
    }

    // Check permissions
    if (user.role !== UserRole.ADMIN && course.teacherId !== user.id) {
      throw new ForbiddenException(
        'Bạn chỉ có thể tạo bài kiểm tra cho khóa học của bạn',
      );
    }

    const normalizedQuestions = this.normalizeIncomingQuestions(
      createQuizDto.questions || [],
    );
    if (normalizedQuestions.length === 0) {
      throw new BadRequestException('Bài kiểm tra phải có ít nhất một câu hỏi');
    }

    const quiz = this.quizRepository.create({
      ...createQuizDto,
      questions: this.toLegacyQuestions(normalizedQuestions),
    });
    const savedQuiz = await this.quizRepository.save(quiz);

    await this.replaceNormalizedQuestionRows(savedQuiz.id, normalizedQuestions);

    return this.findOne(savedQuiz.id);
  }

  async findByCourse(courseId: string): Promise<any[]> {
    const quizzes = await this.quizRepository.find({
      where: { courseId },
      relations: ['quizQuestions', 'quizQuestions.answers'],
      order: { createdAt: 'DESC' },
    });

    return quizzes.map((quiz) => this.serializeQuiz(quiz));
  }

  async findOne(id: string): Promise<any> {
    const quiz = await this.quizRepository.findOne({
      where: { id },
      relations: ['course', 'lesson', 'quizQuestions', 'quizQuestions.answers'],
    });

    if (!quiz) {
      throw new NotFoundException('Bài kiểm tra không tìm thấy');
    }

    return this.serializeQuiz(quiz);
  }

  async update(
    id: string,
    updateQuizDto: Partial<CreateQuizDto>,
    user: User,
  ): Promise<any> {
    const quiz = await this.quizRepository.findOne({
      where: { id },
      relations: ['course', 'quizQuestions', 'quizQuestions.answers'],
    });

    if (!quiz) {
      throw new NotFoundException('Bài kiểm tra không tìm thấy');
    }

    // Check permissions
    if (user.role !== UserRole.ADMIN && quiz.course.teacherId !== user.id) {
      throw new ForbiddenException(
        'Bạn chỉ có thể cập nhật bài kiểm tra cho khóa học của bạn',
      );
    }

    const { questions, ...restPayload } = updateQuizDto;
    Object.assign(quiz, restPayload);

    if (questions) {
      const normalizedQuestions = this.normalizeIncomingQuestions(questions);
      if (normalizedQuestions.length === 0) {
        throw new BadRequestException(
          'Bài kiểm tra phải có ít nhất một câu hỏi hợp lệ',
        );
      }
      quiz.questions = this.toLegacyQuestions(normalizedQuestions);
      await this.quizRepository.save(quiz);
      await this.replaceNormalizedQuestionRows(quiz.id, normalizedQuestions);
    } else {
      await this.quizRepository.save(quiz);
    }

    return this.findOne(id);
  }

  async remove(id: string, user: User): Promise<void> {
    const quiz = await this.quizRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!quiz) {
      throw new NotFoundException('Bài kiểm tra không tìm thấy');
    }

    // Check permissions
    if (user.role !== UserRole.ADMIN && quiz.course.teacherId !== user.id) {
      throw new ForbiddenException(
        'Bạn chỉ có thể xóa bài kiểm tra cho khóa học của bạn',
      );
    }

    await this.quizRepository.remove(quiz);
  }

  async startAttempt(quizId: string, student: User): Promise<QuizAttempt> {
    const quiz = await this.quizRepository.findOne({ where: { id: quizId } });
    if (!quiz) {
      throw new NotFoundException('Bài kiểm tra không tìm thấy');
    }

    // Check previous attempts
    const previousAttempts = await this.attemptRepository.count({
      where: {
        quizId,
        studentId: student.id,
        status: AttemptStatus.COMPLETED,
      },
    });

    if (previousAttempts >= quiz.maxAttempts) {
      throw new BadRequestException('Đã hết số lần thử');
    }

    const attempt = this.attemptRepository.create({
      quizId,
      studentId: student.id,
      status: AttemptStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    return this.attemptRepository.save(attempt);
  }

  async submitAttempt(
    attemptId: string,
    submitQuizDto: SubmitQuizDto,
    student: User,
  ): Promise<QuizAttempt> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId },
      relations: ['quiz', 'quiz.quizQuestions', 'quiz.quizQuestions.answers'],
    });

    if (!attempt) {
      throw new NotFoundException('Bài làm không tìm thấy');
    }

    if (attempt.studentId !== student.id) {
      throw new ForbiddenException('Truy cập bị từ chối');
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Bài làm đã hoàn thành rồi');
    }

    // Calculate score
    const { score, passed } = this.calculateScore(
      attempt.quiz,
      submitQuizDto.answers,
    );

    attempt.answers = submitQuizDto.answers;
    attempt.score = score;
    attempt.passed = passed;
    attempt.status = AttemptStatus.COMPLETED;
    attempt.completedAt = new Date();

    if (attempt.startedAt) {
      const timeSpent = Math.floor(
        (attempt.completedAt.getTime() - attempt.startedAt.getTime()) / 1000,
      );
      attempt.timeSpent = timeSpent;
    }

    return this.attemptRepository.save(attempt);
  }

  async getAttempts(quizId: string, student: User): Promise<QuizAttempt[]> {
    return this.attemptRepository.find({
      where: {
        quizId,
        studentId: student.id,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getAttempt(attemptId: string, student: User): Promise<QuizAttempt> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId },
      relations: ['quiz', 'quiz.quizQuestions', 'quiz.quizQuestions.answers'],
    });

    if (!attempt) {
      throw new NotFoundException('Bài làm không tìm thấy');
    }

    if (attempt.studentId !== student.id) {
      throw new ForbiddenException('Truy cập bị từ chối');
    }

    return attempt;
  }

  private calculateScore(
    quiz: Quiz,
    answers: any[],
  ): { score: number; passed: boolean } {
    const questions = this.getQuestionBank(quiz);
    if (questions.length === 0) {
      return { score: 0, passed: false };
    }

    let correctAnswers = 0;

    questions.forEach((question, index) => {
      const studentAnswer = answers[index];
      if (this.isAnswerCorrect(question, studentAnswer)) {
        correctAnswers++;
      }
    });

    const score = (correctAnswers / questions.length) * 100;
    const passed = score >= quiz.passingScore;

    return { score, passed };
  }

  private isAnswerCorrect(question: any, studentAnswer: any): boolean {
    const normalizedType = String(
      question?.type || 'multiple-choice',
    ).toLowerCase();
    const primaryCorrect = this.toInt(question?.correctAnswer);

    if (
      normalizedType === 'multiple-choice' ||
      normalizedType === 'true-false'
    ) {
      return (
        primaryCorrect !== undefined &&
        primaryCorrect === this.toInt(studentAnswer)
      );
    }

    if (normalizedType === 'multiple-select') {
      const correctAnswers = Array.isArray(question?.correctAnswers)
        ? question.correctAnswers
            .map((value: any) => this.toInt(value))
            .filter(
              (value: number | undefined): value is number =>
                value !== undefined,
            )
        : [];
      const studentAnswers = Array.isArray(studentAnswer)
        ? studentAnswer
            .map((value: any) => this.toInt(value))
            .filter(
              (value: number | undefined): value is number =>
                value !== undefined,
            )
        : [];
      return (
        correctAnswers.length === studentAnswers.length &&
        correctAnswers.every((answer: number) =>
          studentAnswers.includes(answer),
        )
      );
    }

    return false;
  }

  private serializeQuiz(quiz: Quiz): any {
    return {
      ...quiz,
      questions: this.getQuestionBank(quiz),
    };
  }

  private getQuestionBank(quiz: Quiz): QuestionBankItem[] {
    const normalizedQuestions = this.getNormalizedQuestionBank(quiz);
    if (normalizedQuestions.length > 0) {
      return normalizedQuestions;
    }
    return this.parseLegacyQuestions(quiz?.questions);
  }

  private getNormalizedQuestionBank(quiz: Quiz): QuestionBankItem[] {
    const rows = Array.isArray(quiz?.quizQuestions) ? quiz.quizQuestions : [];
    const sortedRows = [...rows].sort(
      (a, b) => (a.questionOrder || 0) - (b.questionOrder || 0),
    );

    return sortedRows.map((row) => {
      const answers = Array.isArray(row.answers) ? [...row.answers] : [];
      const sortedAnswers = answers.sort(
        (a, b) => (a.answerOrder || 0) - (b.answerOrder || 0),
      );
      const options = sortedAnswers.map((answer) => answer.content || '');
      const correctIndexes = sortedAnswers
        .map((answer, index) => (answer.isCorrect ? index : -1))
        .filter((index) => index >= 0);

      const type = this.inferQuestionType(options, correctIndexes);
      const plainText = this.stripHtml(row.contentHtml || '');

      return {
        id: row.id,
        question: plainText,
        content: row.contentHtml,
        contentHtml: row.contentHtml,
        content_html: row.contentHtml,
        image: row.image || undefined,
        difficulty: row.difficulty ?? undefined,
        topic: row.topic || undefined,
        learningObj: row.learningObj || undefined,
        globalObj: row.globalObj || undefined,
        type,
        options,
        correctAnswer: correctIndexes[0],
        correctAnswers: correctIndexes.length > 1 ? correctIndexes : undefined,
        answers: sortedAnswers.map((answer) => ({
          id: answer.id,
          question_id: row.id,
          content: answer.content,
          is_correct: !!answer.isCorrect,
          isCorrect: !!answer.isCorrect,
        })),
      };
    });
  }

  private parseLegacyQuestions(raw: unknown): QuestionBankItem[] {
    let normalizedRaw: unknown = raw;

    if (typeof normalizedRaw === 'string') {
      try {
        normalizedRaw = JSON.parse(normalizedRaw);
      } catch {
        normalizedRaw = [];
      }
    }

    if (!Array.isArray(normalizedRaw)) return [];

    return normalizedRaw
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const q = item as Record<string, any>;
        const options = Array.isArray(q.options)
          ? q.options.map((opt: any) => String(opt ?? '')).filter(Boolean)
          : [];

        const correctAnswer = this.toInt(q.correctAnswer);
        const correctAnswers = Array.isArray(q.correctAnswers)
          ? q.correctAnswers
              .map((value: any) => this.toInt(value))
              .filter(
                (value: number | undefined): value is number =>
                  value !== undefined,
              )
          : [];

        return {
          question: String(
            q.question ?? this.stripHtml(String(q.content ?? '')),
          ),
          content: q.content,
          contentHtml: q.contentHtml ?? q.content_html,
          content_html: q.content_html ?? q.contentHtml,
          image: q.image,
          difficulty:
            this.toInt(q.difficulty) !== undefined
              ? this.toInt(q.difficulty)
              : undefined,
          topic: q.topic,
          learningObj: q.learningObj ?? q.learning_obj,
          globalObj: q.globalObj ?? q.global_obj,
          type: String(q.type || 'multiple-choice'),
          options,
          correctAnswer: correctAnswer,
          correctAnswers:
            correctAnswers.length > 1 ? correctAnswers : undefined,
          answers: Array.isArray(q.answers) ? q.answers : undefined,
        } as QuestionBankItem;
      })
      .filter((item): item is QuestionBankItem => item !== null);
  }

  private normalizeIncomingQuestions(
    rawQuestions: any[],
  ): NormalizedIncomingQuestion[] {
    if (!Array.isArray(rawQuestions)) return [];

    return rawQuestions
      .map((raw) => {
        if (!raw || typeof raw !== 'object') return null;
        const question = raw as Record<string, any>;

        const contentHtml = String(
          question.content_html ??
            question.contentHtml ??
            question.content ??
            question.question ??
            '',
        ).trim();
        if (!contentHtml) return null;

        const answersPayload = Array.isArray(question.answers)
          ? question.answers.filter(
              (answer: any) => answer && typeof answer === 'object',
            )
          : [];
        const optionsFromPayload = Array.isArray(question.options)
          ? question.options
              .map((opt: any) => String(opt ?? '').trim())
              .filter(Boolean)
          : [];
        const optionsFromAnswers = answersPayload
          .map((answer: any) =>
            String(answer.content ?? answer.text ?? '').trim(),
          )
          .filter(Boolean);
        const options =
          optionsFromPayload.length > 0
            ? optionsFromPayload
            : optionsFromAnswers;

        let correctAnswerIndices: number[] = [];
        if (Array.isArray(question.correctAnswers)) {
          correctAnswerIndices = question.correctAnswers
            .map((value: any) => this.toInt(value))
            .filter(
              (value: number | undefined): value is number =>
                value !== undefined,
            );
        } else if (
          question.correctAnswer !== undefined &&
          question.correctAnswer !== null
        ) {
          const primary = this.toInt(question.correctAnswer);
          if (primary !== undefined) {
            correctAnswerIndices = [primary];
          }
        }

        if (correctAnswerIndices.length === 0 && answersPayload.length > 0) {
          correctAnswerIndices = answersPayload
            .map((answer: any, index: number) => {
              const rawFlag = answer.is_correct ?? answer.isCorrect;
              const isCorrect =
                rawFlag === true ||
                rawFlag === 1 ||
                String(rawFlag).toLowerCase() === 'true';
              return isCorrect ? index : -1;
            })
            .filter((index: number) => index >= 0);
        }

        if (options.length > 0 && correctAnswerIndices.length === 0) {
          correctAnswerIndices = [0];
        }

        const inferredType = this.inferQuestionType(
          options,
          correctAnswerIndices,
        );
        const declaredType = String(question.type || '')
          .trim()
          .toLowerCase();

        return {
          contentHtml,
          image: String(question.image || '').trim() || undefined,
          difficulty: this.toInt(question.difficulty),
          topic: String(question.topic || '').trim() || undefined,
          learningObj:
            String(
              question.learningObj ?? question.learning_obj ?? '',
            ).trim() || undefined,
          globalObj:
            String(question.globalObj ?? question.global_obj ?? '').trim() ||
            undefined,
          type: declaredType || inferredType,
          options,
          correctAnswerIndices,
        } as NormalizedIncomingQuestion;
      })
      .filter(
        (item): item is NormalizedIncomingQuestion =>
          item !== null && item.contentHtml.length > 0,
      );
  }

  private toLegacyQuestions(
    normalizedQuestions: NormalizedIncomingQuestion[],
  ): QuestionBankItem[] {
    return normalizedQuestions.map((question) => ({
      question: this.stripHtml(question.contentHtml),
      content: question.contentHtml,
      contentHtml: question.contentHtml,
      content_html: question.contentHtml,
      image: question.image,
      difficulty: question.difficulty,
      topic: question.topic,
      learningObj: question.learningObj,
      globalObj: question.globalObj,
      type: question.type,
      options: question.options,
      correctAnswer: question.correctAnswerIndices[0],
      correctAnswers:
        question.correctAnswerIndices.length > 1
          ? question.correctAnswerIndices
          : undefined,
      answers: question.options.map((option, index) => ({
        content: option,
        is_correct: question.correctAnswerIndices.includes(index),
        isCorrect: question.correctAnswerIndices.includes(index),
      })),
    }));
  }

  private async replaceNormalizedQuestionRows(
    quizId: string,
    normalizedQuestions: NormalizedIncomingQuestion[],
  ): Promise<void> {
    const existingRows = await this.quizQuestionRepository.find({
      where: { quizId },
      select: ['id'],
    });
    const existingIds = existingRows.map((row) => row.id);

    if (existingIds.length > 0) {
      await this.quizAnswerRepository
        .createQueryBuilder()
        .delete()
        .where('"questionId" IN (:...ids)', { ids: existingIds })
        .execute();
      await this.quizQuestionRepository.delete({ quizId });
    }

    for (
      let questionIndex = 0;
      questionIndex < normalizedQuestions.length;
      questionIndex += 1
    ) {
      const question = normalizedQuestions[questionIndex];
      const savedQuestion = await this.quizQuestionRepository.save(
        this.quizQuestionRepository.create({
          quizId,
          contentHtml: question.contentHtml,
          image: question.image,
          difficulty: question.difficulty,
          topic: question.topic,
          learningObj: question.learningObj,
          globalObj: question.globalObj,
          questionOrder: questionIndex + 1,
        }),
      );

      if (question.options.length === 0) {
        continue;
      }

      const answers = question.options.map((option, optionIndex) =>
        this.quizAnswerRepository.create({
          questionId: savedQuestion.id,
          content: option,
          isCorrect: question.correctAnswerIndices.includes(optionIndex),
          answerOrder: optionIndex + 1,
        }),
      );

      await this.quizAnswerRepository.save(answers);
    }
  }

  private inferQuestionType(
    options: string[],
    correctIndexes: number[],
  ): string {
    if (correctIndexes.length > 1) {
      return 'multiple-select';
    }

    if (
      options.length === 2 &&
      options.some((opt) => /^(đúng|true)$/i.test(opt.trim())) &&
      options.some((opt) => /^(sai|false)$/i.test(opt.trim()))
    ) {
      return 'true-false';
    }

    return 'multiple-choice';
  }

  private stripHtml(value: string): string {
    if (!value) return '';
    return value
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
  }

  private toInt(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isInteger(value)) {
      return value;
    }
    if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
      return Number.parseInt(value, 10);
    }
    return undefined;
  }
}
