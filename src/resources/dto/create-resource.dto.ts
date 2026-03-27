import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsNumber,
} from 'class-validator';

export enum ResourceType {
  VIDEO = 'video',
  DOCUMENT = 'document',
  IMAGE = 'image',
  LINK = 'link',
  OTHER = 'other',
}

export class CreateResourceDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ResourceType)
  @IsNotEmpty()
  type: ResourceType;

  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  filePath?: string;

  @IsNumber()
  @IsOptional()
  fileSize?: number;

  @IsUUID('all')
  @IsNotEmpty()
  courseId: string;

  @IsUUID('all')
  @IsOptional()
  lessonId?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

