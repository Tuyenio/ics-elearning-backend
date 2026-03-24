import { IsArray, IsNotEmpty } from 'class-validator';

export class SubmitQuizDto {
  @IsArray()
  @IsNotEmpty()
  answers: unknown[];
}
