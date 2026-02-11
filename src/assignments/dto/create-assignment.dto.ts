import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  IsArray,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { AssignmentStatus } from '../entities/assignment.entity';

export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsUUID()
  @IsNotEmpty()
  courseId: string;

  @IsUUID()
  @IsOptional()
  lessonId?: string;

  @IsInt()
  @IsOptional()
  maxScore?: number;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsEnum(AssignmentStatus)
  @IsOptional()
  status?: AssignmentStatus;

  @IsBoolean()
  @IsOptional()
  allowLateSubmission?: boolean;

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsArray()
  @IsOptional()
  attachments?: string[];
}
