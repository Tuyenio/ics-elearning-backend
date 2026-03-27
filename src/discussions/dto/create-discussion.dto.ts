import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateDiscussionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsUUID('all')
  @IsNotEmpty()
  courseId: string;

  @IsUUID('all')
  @IsOptional()
  lessonId?: string;

  @IsUUID('all')
  @IsOptional()
  parentId?: string;
}

