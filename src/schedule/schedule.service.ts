import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduleItem } from './entities/schedule.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(ScheduleItem)
    private repo: Repository<ScheduleItem>,
  ) {}

  async findAll(userId: string) {
    try {
      return await this.repo.find({
        where: { userId },
        order: { dueDate: 'ASC', time: 'ASC' },
      });
    } catch {
      throw new BadRequestException('Failed to fetch schedule items');
    }
  }

  async create(dto: CreateScheduleDto, userId: string) {
    try {
      const item = this.repo.create({
        ...dto,
        userId,
        tags: dto.tags || [],
      });
      return await this.repo.save(item);
    } catch {
      throw new BadRequestException('Failed to create schedule item');
    }
  }

  async update(id: string, dto: UpdateScheduleDto, userId: string) {
    try {
      // Find the existing item
      const item = await this.repo.findOne({ where: { id, userId } });
      if (!item) {
        throw new BadRequestException('Schedule item not found');
      }

      // Update and return the updated entity
      Object.assign(item, {
        ...dto,
        tags: dto.tags !== undefined ? dto.tags : item.tags,
      });
      return await this.repo.save(item);
    } catch {
      throw new BadRequestException('Failed to update schedule item');
    }
  }

  async remove(id: string, userId: string) {
    try {
      const item = await this.repo.findOne({ where: { id, userId } });
      if (!item) {
        throw new BadRequestException('Schedule item not found');
      }
      await this.repo.remove(item);
      return { success: true, message: 'Schedule item deleted successfully' };
    } catch {
      throw new BadRequestException('Failed to delete schedule item');
    }
  }
}
