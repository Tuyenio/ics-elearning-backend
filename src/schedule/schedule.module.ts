import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ScheduleItem } from './entities/schedule.entity'
import { ScheduleService } from './schedule.service'
import { ScheduleController } from './schedule.controller'

@Module({
  imports: [TypeOrmModule.forFeature([ScheduleItem])],
  providers: [ScheduleService],
  controllers: [ScheduleController],
})
export class ScheduleModule {}
