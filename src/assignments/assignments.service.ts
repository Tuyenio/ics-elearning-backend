import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import {
  Assignment,
  AssignmentSubmission,
  SubmissionStatus,
} from './entities/assignment.entity';
import { UserRole } from '../users/entities/user.entity';

type SubmissionAttachmentInput =
  | string
  | {
      url?: string;
      name?: string;
      filename?: string;
    };

type SubmissionAttachmentOutput = {
  url: string;
  name?: string;
};

const ATTACHMENT_NAME_SEPARATOR = '::name::';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(AssignmentSubmission)
    private readonly submissionRepo: Repository<AssignmentSubmission>,
  ) {}

  async create(createAssignmentDto: CreateAssignmentDto, userId: string) {
    const assignment = this.assignmentRepo.create({
      ...createAssignmentDto,
      createdBy: userId,
    });
    return this.assignmentRepo.save(assignment);
  }

  async findByCourse(courseId: string) {
    return this.assignmentRepo.find({
      where: { courseId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByLesson(lessonId: string) {
    return this.assignmentRepo.find({
      where: { lessonId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id },
      relations: ['course', 'lesson', 'creator'],
    });

    if (!assignment) {
      throw new NotFoundException(`Bài tập với ID ${id} không tìm thấy`);
    }

    return assignment;
  }

  async update(id: string, updateAssignmentDto: UpdateAssignmentDto) {
    const assignment = await this.findOne(id);
    Object.assign(assignment, updateAssignmentDto);
    return this.assignmentRepo.save(assignment);
  }

  async remove(id: string) {
    const assignment = await this.findOne(id);
    await this.assignmentRepo.remove(assignment);
    return { message: 'Đã xoá bài tập thành công' };
  }

  // Submission methods
  async submitAssignment(
    assignmentId: string,
    content: string,
    attachments: SubmissionAttachmentInput[],
    userId: string,
  ) {
    const assignment = await this.findOne(assignmentId);

    // Check if already submitted
    const existing = await this.submissionRepo.findOne({
      where: { assignmentId, studentId: userId },
    });

    if (existing && existing.status !== SubmissionStatus.NOT_SUBMITTED) {
      throw new BadRequestException('Bài tập đã được nộp rồi');
    }

    // Check due date
    const now = new Date();
    const isLate = assignment.dueDate && now > assignment.dueDate;

    if (isLate && !assignment.allowLateSubmission) {
      throw new BadRequestException('Hạn nộp bài tập đã hết');
    }

    const normalizedAttachments = this.serializeSubmissionAttachments(attachments);

    const submission = this.submissionRepo.create({
      assignmentId,
      studentId: userId,
      content,
      attachments: normalizedAttachments,
      status: isLate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED,
      submittedAt: now,
    });

    return this.submissionRepo.save(submission);
  }

  async getSubmissionsByAssignment(
    assignmentId: string,
    userId: string,
    userRole: UserRole,
  ) {
    await this.ensureTeacherCanAccessAssignment(assignmentId, userId, userRole);
    
    const submissions = await this.submissionRepo
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.student', 'student')
      .where('submission.assignmentId = :assignmentId', { assignmentId })
      .orderBy('submission.submittedAt', 'DESC')
      .addOrderBy('submission.createdAt', 'DESC')
      .select([
        'submission.id',
        'submission.assignmentId',
        'submission.studentId',
        'submission.content',
        'submission.attachments',
        'submission.score',
        'submission.feedback',
        'submission.status',
        'submission.submittedAt',
        'submission.gradedAt',
        'submission.gradedBy',
        'student.id',
        'student.name',
        'student.email',
      ])
      .getMany();

    return submissions.map((submission) => ({
      id: submission.id,
      assignmentId: submission.assignmentId,
      studentId: submission.studentId,
      studentName: submission.student?.name && submission.student.name.trim() 
        ? submission.student.name 
        : (submission.student?.email || 'Unknown Student'),
      studentEmail: submission.student?.email,
      content: submission.content,
      attachments: this.deserializeSubmissionAttachments(submission.attachments),
      score: submission.score,
      feedback: submission.feedback,
      status: submission.status,
      submittedAt: submission.submittedAt,
      gradedAt: submission.gradedAt,
      gradedBy: submission.gradedBy,
    }));
  }

  async getMySubmission(assignmentId: string, userId: string) {
    const submission = await this.submissionRepo.findOne({
      where: { assignmentId, studentId: userId },
      relations: ['assignment', 'grader'],
    });

    if (!submission) {
      return null;
    }

    return {
      ...submission,
      attachments: this.deserializeSubmissionAttachments(submission.attachments),
    };
  }

  async gradeSubmission(
    submissionId: string,
    score: number,
    feedback: string,
    gradingDetails:
      | Array<{
          criterion: string;
          selectedLevel: number;
          points: number;
        }>
      | undefined,
    userId: string,
    userRole: UserRole,
  ) {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId },
      relations: ['assignment', 'assignment.course'],
    });

    if (!submission) {
      throw new NotFoundException('Bài nộp không tìm thấy');
    }

    if (userRole !== UserRole.ADMIN) {
      const teacherId = submission.assignment?.course?.teacherId;
      if (teacherId !== userId) {
        throw new ForbiddenException('Bạn không có quyền chấm bài nộp này');
      }
    }

    if (score > submission.assignment.maxScore) {
      throw new BadRequestException(
        `Điểm số không thể vượt quá điểm tối đa ${submission.assignment.maxScore}`,
      );
    }

    submission.score = score;
    submission.feedback = feedback;
    submission.gradingDetails = Array.isArray(gradingDetails)
      ? JSON.stringify(gradingDetails)
      : undefined;
    submission.status = SubmissionStatus.GRADED;
    submission.gradedBy = userId;
    submission.gradedAt = new Date();

    return this.submissionRepo.save(submission);
  }

  private async ensureTeacherCanAccessAssignment(
    assignmentId: string,
    userId: string,
    userRole: UserRole,
  ) {
    if (userRole === UserRole.ADMIN) return;

    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: ['course'],
    });

    if (!assignment) {
      throw new NotFoundException('Bài tập không tìm thấy');
    }

    if (assignment.course?.teacherId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem bài nộp của bài tập này');
    }
  }

  private serializeSubmissionAttachments(
    attachments: SubmissionAttachmentInput[] | undefined,
  ): string[] {
    if (!Array.isArray(attachments)) return [];

    const normalized: string[] = [];

    for (const item of attachments) {
      if (typeof item === 'string') {
        const url = item.trim();
        if (url) normalized.push(url);
        continue;
      }

      if (!item || typeof item !== 'object') continue;

      const url = String(item.url || '').trim();
      if (!url) continue;

      const name = String(item.name || item.filename || '').trim();
      if (!name) {
        normalized.push(url);
        continue;
      }

      normalized.push(`${url}${ATTACHMENT_NAME_SEPARATOR}${encodeURIComponent(name)}`);
    }

    return normalized;
  }

  private deserializeSubmissionAttachments(
    attachments: string[] | undefined,
  ): SubmissionAttachmentOutput[] {
    if (!Array.isArray(attachments)) return [];

    return attachments
      .map((raw) => {
        if (typeof raw !== 'string') return null;
        const value = raw.trim();
        if (!value) return null;

        const separatorIndex = value.indexOf(ATTACHMENT_NAME_SEPARATOR);
        if (separatorIndex === -1) {
          return { url: value };
        }

        const url = value.slice(0, separatorIndex).trim();
        const encodedName = value
          .slice(separatorIndex + ATTACHMENT_NAME_SEPARATOR.length)
          .trim();

        if (!url) return null;

        let name = '';
        try {
          name = decodeURIComponent(encodedName);
        } catch {
          name = encodedName;
        }

        return name ? { url, name } : { url };
      })
      .filter(
        (item): item is SubmissionAttachmentOutput =>
          Boolean(item && typeof item.url === 'string' && item.url.length > 0),
      );
  }
}
