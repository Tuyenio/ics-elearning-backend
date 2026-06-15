import { IsOptional, IsString, IsEmail, MinLength } from 'class-validator';

/**
 * DTO for authenticated users updating their own profile.
 * Deliberately excludes role, status, and all server-generated token fields
 * to prevent privilege escalation (IDOR).
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  dateOfBirth?: Date;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
