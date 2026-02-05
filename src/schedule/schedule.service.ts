import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ScheduleItem } from './entities/schedule.entity'
import { CreateScheduleDto } from './dto/create-schedule.dto'
import { UpdateScheduleDto } from './dto/update-schedule.dto'

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(ScheduleItem)
    private repo: Repository<ScheduleItem>,
  ) {}

  findAll() {
    return this.repo.find({ order: { dueDate: 'ASC', time: 'ASC' } })
  }

  create(dto: CreateScheduleDto) {
    const item = this.repo.create(dto)
    return this.repo.save(item)
  }

  update(id: string, dto: UpdateScheduleDto) {
    return this.repo.update(id, dto)
  }

  remove(id: string) {
    return this.repo.delete(id)
  }
}
