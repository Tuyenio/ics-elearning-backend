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
  IsDateString,
} from 'class-validator';

export enum ExamType {
  PRACTICE = 'practice',
  OFFICIAL = 'official',
}

export enum ExamStatusDto {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
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

  @IsEnum(ExamStatusDto)
  @IsOptional()
  status?: ExamStatusDto;

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
  shuffleAnswers?: boolean;

  @IsBoolean()
  @IsOptional()
  showCorrectAnswers?: boolean;

  @IsDateString()
  @IsOptional()
  availableFrom?: string;

  @IsDateString()
  @IsOptional()
  availableUntil?: string;

  @IsUUID('all')
  @IsOptional()
  certificateTemplateId?: string;

  @IsUUID('all')
  @IsNotEmpty()
  courseId: string;
}

