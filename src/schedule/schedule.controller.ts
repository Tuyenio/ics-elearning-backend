import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { ScheduleService } from './schedule.service'
import { CreateScheduleDto } from './dto/create-schedule.dto'
import { UpdateScheduleDto } from './dto/update-schedule.dto'

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}

  @Get()
  async findAll() {
    try {
      const items = await this.service.findAll()
      return { success: true, data: items }
    } catch (error) {
      throw new HttpException(
        { success: false, message: error.message || 'Failed to fetch schedule' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  @Post()
  async create(@Body() dto: CreateScheduleDto) {
    try {
      const item = await this.service.create(dto)
      return { success: true, data: item }
    } catch (error) {
      throw new HttpException(
        { success: false, message: error.message || 'Failed to create schedule' },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    try {
      const item = await this.service.update(id, dto)
      return { success: true, data: item }
    } catch (error) {
      throw new HttpException(
        { success: false, message: error.message || 'Failed to update schedule' },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const result = await this.service.remove(id)
      return { success: true, message: result.message }
    } catch (error) {
      throw new HttpException(
        { success: false, message: error.message || 'Failed to delete schedule' },
        HttpStatus.BAD_REQUEST,
      )
    }
  }
}
