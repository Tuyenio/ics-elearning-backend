import { IsUUID, IsNotEmpty } from 'class-validator';

export class CreateEnrollmentDto {
  @IsUUID('all')
  @IsNotEmpty()
  courseId: string;
}

