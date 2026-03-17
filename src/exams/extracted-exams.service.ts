import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class ExtractedExamsService {
  constructor(
    @InjectRepository(ExtractedExam)
    private readonly extractedExamRepo: Repository<ExtractedExam>,
  ) {}

  private normalizeStatus(status?: ExtractedExamStatusDto): ExtractedExamStatus {
    if (!status) return ExtractedExamStatus.APPROVED;
    const normalized = String(status).toLowerCase();
    if (normalized === ExtractedExamStatus.DRAFT) return ExtractedExamStatus.DRAFT;
    if (normalized === ExtractedExamStatus.PENDING) return ExtractedExamStatus.PENDING;
    if (normalized === ExtractedExamStatus.REJECTED) return ExtractedExamStatus.REJECTED;
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
    if (dto.type === ExtractedExamTypeDto.OFFICIAL && !dto.certificateTemplateId) {
      throw new BadRequestException('Bài thi thật cần chọn chứng chỉ');
    }
  }

  async create(dto: CreateExtractedExamDto, teacherId: string) {
    this.validateOfficial(dto);
    if (!dto.questions || dto.questions.length === 0) {
      throw new BadRequestException('Cần ít nhất 1 câu hỏi');
    }

    // Normalize datetime strings to Date to satisfy entity typing
    const availableFrom = dto.availableFrom ? new Date(dto.availableFrom) : undefined;
    const availableUntil = dto.availableUntil ? new Date(dto.availableUntil) : undefined;

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
    const exam = await this.extractedExamRepo.findOne({ where: { id, teacherId } });
    if (!exam) throw new NotFoundException('Không tìm thấy đề thi');
    return exam;
  }

  async update(id: string, teacherId: string, dto: Partial<CreateExtractedExamDto>) {
    const exam = await this.extractedExamRepo.findOne({ where: { id, teacherId } });
    if (!exam) throw new NotFoundException('Không tìm thấy đề thi');

    if (dto.type === ExtractedExamTypeDto.OFFICIAL && !dto.certificateTemplateId && !exam.certificateTemplateId) {
      throw new BadRequestException('Bài thi thật cần chọn chứng chỉ');
    }

    const nextStatus = dto.status ? this.normalizeStatus(dto.status) : undefined;
    const nextType = dto.type ? this.normalizeType(dto.type) : undefined;

    const updatePayload: Partial<ExtractedExam> = {
      ...dto,
      status: nextStatus ?? exam.status,
      type: nextType ?? exam.type,
    } as Partial<ExtractedExam>;

    await this.extractedExamRepo.update(id, updatePayload);
    return this.findOne(id, teacherId);
  }

  async remove(id: string, teacherId: string) {
    const exam = await this.extractedExamRepo.findOne({ where: { id, teacherId } });
    if (!exam) throw new NotFoundException('Không tìm thấy đề thi');
    await this.extractedExamRepo.delete(id);
    return { success: true };
  }
}
