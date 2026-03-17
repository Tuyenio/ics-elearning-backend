import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  ValidateNested,
  IsInt,
  IsIn,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

class QuizAnswerDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsBoolean()
  @IsOptional()
  isCorrect?: boolean;
}

class QuizQuestionDto {
  @IsString()
  @IsOptional()
  question?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  contentHtml?: string;

  @IsString()
  @IsOptional()
  content_html?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  @IsOptional()
  answers?: QuizAnswerDto[];

  @IsString()
  @IsIn(['multiple-choice', 'multiple-select', 'true-false'])
  @IsOptional()
  type?: 'multiple-choice' | 'multiple-select' | 'true-false';

  @IsInt()
  @IsOptional()
  correctAnswer?: number;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  correctAnswers?: number[];

  @IsNumber()
  @IsOptional()
  difficulty?: number;

  @IsString()
  @IsOptional()
  topic?: string;

  @IsString()
  @IsOptional()
  learningObj?: string;

  @IsString()
  @IsOptional()
  globalObj?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class CreateQuizDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  @IsNotEmpty()
  questions: QuizQuestionDto[];

  @IsNumber()
  @Min(1)
  @IsOptional()
  timeLimit?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  passingScore?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxAttempts?: number;

  @IsBoolean()
  @IsOptional()
  showCorrectAnswers?: boolean;

  @IsBoolean()
  @IsOptional()
  shuffleQuestions?: boolean;

  @IsString()
  @IsNotEmpty()
  courseId: string;

  @IsString()
  @IsOptional()
  lessonId?: string;
}
