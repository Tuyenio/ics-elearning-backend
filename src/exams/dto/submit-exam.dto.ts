import { IsNotEmpty, IsArray, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ExamAnswerDto {
  @IsUUID()
  @IsNotEmpty()
  questionId: string;

  @IsNotEmpty()
  answer: string | string[];
}

export class SubmitExamDto {
  @IsUUID()
  @IsNotEmpty()
  attemptId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamAnswerDto)
  answers: ExamAnswerDto[];
}
