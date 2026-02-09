import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsArray,
  Matches,
} from 'class-validator'

export class CreateScheduleDto {
  @IsString()
  title: string

  @IsString()
  course: string

  @IsEnum(['lesson', 'exam', 'live'])
  type: 'lesson' | 'exam' | 'live'

  @IsEnum(['todo', 'in-progress', 'completed'])
  status: 'todo' | 'in-progress' | 'completed'

  @IsString()
  time: string

  @IsString()
  duration: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dueDate must be in YYYY-MM-DD format' })
  dueDate?: string

  @IsBoolean()
  completed: boolean

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsBoolean()
  important?: boolean

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]
}
