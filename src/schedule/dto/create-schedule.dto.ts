import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsArray,
  IsDateString,
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

  @IsDateString()
  dueDate: string

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
  tags?: string[]
}
