import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export enum ExtractedExamTypeDto {
  PRACTICE = 'practice',
  OFFICIAL = 'official',
}

export enum ExtractedExamStatusDto {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export class CreateExtractedExamDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ExtractedExamTypeDto)
  @IsOptional()
  type?: ExtractedExamTypeDto;

  @IsEnum(ExtractedExamStatusDto)
  @IsOptional()
  status?: ExtractedExamStatusDto;

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

  @IsUUID()
  @IsOptional()
  certificateTemplateId?: string;

  @IsUUID()
  @IsOptional()
  sourceExamId?: string;

  @IsUUID()
  @IsNotEmpty()
  courseId: string;
}
