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

  async findAll() {
    try {
      return await this.repo.find({ order: { dueDate: 'ASC', time: 'ASC' } });
    } catch (error) {
      throw new BadRequestException('Failed to fetch schedule items');
    }
  }

  async create(dto: CreateScheduleDto) {
    try {
      const item = this.repo.create({
        ...dto,
        tags: dto.tags || [],
      });
      return await this.repo.save(item);
    } catch (error) {
      throw new BadRequestException('Failed to create schedule item');
    }
  }

  async update(id: string, dto: UpdateScheduleDto) {
    try {
      // Find the existing item
      const item = await this.repo.findOne({ where: { id } });
      if (!item) {
        throw new BadRequestException('Schedule item not found');
      }

      // Update and return the updated entity
      Object.assign(item, {
        ...dto,
        tags: dto.tags !== undefined ? dto.tags : item.tags,
      });
      return await this.repo.save(item);
    } catch (error) {
      throw new BadRequestException('Failed to update schedule item');
    }
  }

  async remove(id: string) {
    try {
      const item = await this.repo.findOne({ where: { id } });
      if (!item) {
        throw new BadRequestException('Schedule item not found');
      }
      await this.repo.remove(item);
      return { success: true, message: 'Schedule item deleted successfully' };
    } catch (error) {
      throw new BadRequestException('Failed to delete schedule item');
    }
  }
}
