import {
  IsUUID,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class NoteItemDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  deadline?: string;

  @IsString()
  @IsOptional()
  priority?: 'high' | 'medium' | 'low';

  @IsNotEmpty()
  completed: boolean;
}

class NoteScheduleDto {
  @IsString()
  date: string;

  @IsString()
  time: string;

  @IsString()
  content: string;
}

export class CreateNoteDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsUUID('all')
  @IsOptional()
  courseId?: string;

  @IsUUID('all')
  @IsOptional()
  lessonId?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  timestamp?: number;

  @IsEnum(['general', 'deadline', 'checklist', 'plan'])
  @IsOptional()
  type?: 'general' | 'deadline' | 'checklist' | 'plan';

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NoteItemDto)
  @IsOptional()
  items?: NoteItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NoteScheduleDto)
  @IsOptional()
  schedule?: NoteScheduleDto[];
}

