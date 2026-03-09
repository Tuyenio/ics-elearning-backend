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
} from 'class-validator';
import { Type } from 'class-transformer';

class QuizQuestionDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  options: string[];

  @IsString()
  @IsIn(['multiple-choice', 'multiple-select', 'true-false'])
  type: 'multiple-choice' | 'multiple-select' | 'true-false';

  @IsInt()
  @IsOptional()
  correctAnswer?: number;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  correctAnswers?: number[];
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
