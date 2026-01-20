import { IsNotEmpty, IsArray, IsObject, IsUUID } from 'class-validator';

export class SubmitExamDto {
  @IsUUID()
  @IsNotEmpty()
  attemptId: string;

  @IsArray()
  @IsNotEmpty()
  answers: Record<string, any>[];
}
