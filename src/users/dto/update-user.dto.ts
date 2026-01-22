import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsEnum, IsString, IsBoolean, IsDate, IsEmail, IsPhoneNumber, MinLength } from 'class-validator';
import { UserRole, UserStatus } from '../entities/user.entity';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber('VN')
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
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  @IsOptional()
  @IsDate()
  emailVerifiedAt?: Date;

  @IsOptional()
  @IsString()
  emailVerificationToken?: string;

  @IsOptional()
  @IsString()
  passwordResetToken?: string;

  @IsOptional()
  @IsDate()
  passwordResetTokenExpires?: Date;
}