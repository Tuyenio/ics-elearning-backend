import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
    attachments: string[],
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

    const submission = this.submissionRepo.create({
      assignmentId,
      studentId: userId,
      content,
      attachments,
      status: isLate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED,
      submittedAt: now,
    });

    return this.submissionRepo.save(submission);
  }

  async getSubmissionsByAssignment(assignmentId: string) {
    return this.submissionRepo.find({
      where: { assignmentId },
      relations: ['student'],
      order: { submittedAt: 'DESC' },
    });
  }

  async getMySubmission(assignmentId: string, userId: string) {
    return this.submissionRepo.findOne({
      where: { assignmentId, studentId: userId },
      relations: ['assignment', 'grader'],
    });
  }

  async gradeSubmission(
    submissionId: string,
    score: number,
    feedback: string,
    userId: string,
  ) {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId },
      relations: ['assignment'],
    });

    if (!submission) {
      throw new NotFoundException('Bài nộp không tìm thấy');
    }

    if (score > submission.assignment.maxScore) {
      throw new BadRequestException(
        `Điểm số không thể vượt quá điểm tối đa ${submission.assignment.maxScore}`,
      );
    }

    submission.score = score;
    submission.feedback = feedback;
    submission.status = SubmissionStatus.GRADED;
    submission.gradedBy = userId;
    submission.gradedAt = new Date();

    return this.submissionRepo.save(submission);
  }
}
