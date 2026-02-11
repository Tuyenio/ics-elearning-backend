import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsEnum,
  Min,
  Max,
  IsInt,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ExamType {
  MIDTERM = 'midterm',
  FINAL = 'final',
  PRACTICE = 'practice',
  QUIZ = 'quiz',
}

export class CreateExamDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ExamType)
  @IsOptional()
  type?: ExamType;

  @IsArray()
  @IsNotEmpty()
  questions: any[];

  @IsInt()
  @Min(1)
  @IsOptional()
  timeLimit?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  passingScore?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxAttempts?: number;

  @IsBoolean()
  @IsOptional()
  shuffleQuestions?: boolean;

  @IsBoolean()
  @IsOptional()
  showCorrectAnswers?: boolean;

  @IsUUID()
  @IsOptional()
  certificateTemplateId?: string;

  @IsUUID()
  @IsNotEmpty()
  courseId: string;
}
