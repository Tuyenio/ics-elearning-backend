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
  UseGuards,
  Req,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error';

@Controller('schedule')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}

  @Get()
  async findAll(@Req() req: any) {
    try {
      const items = await this.service.findAll(req.user.id);
      return { success: true, data: items };
    } catch (error: unknown) {
      throw new HttpException(
        {
          success: false,
          message: getErrorMessage(error) || 'Failed to fetch schedule',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async create(@Body() dto: CreateScheduleDto, @Req() req: any) {
    try {
      const item = await this.service.create(dto, req.user.id);
      return { success: true, data: item };
    } catch (error: unknown) {
      throw new HttpException(
        {
          success: false,
          message: getErrorMessage(error) || 'Failed to create schedule',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateScheduleDto, @Req() req: any) {
    try {
      const item = await this.service.update(id, dto, req.user.id);
      return { success: true, data: item };
    } catch (error: unknown) {
      throw new HttpException(
        {
          success: false,
          message: getErrorMessage(error) || 'Failed to update schedule',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    try {
      const result = await this.service.remove(id, req.user.id);
      return { success: true, message: result.message };
    } catch (error: unknown) {
      throw new HttpException(
        {
          success: false,
          message: getErrorMessage(error) || 'Failed to delete schedule',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
