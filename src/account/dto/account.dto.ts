import {
  IsOptional,
  IsString,
  IsDateString,
  IsEmail,
  MinLength,
} from 'class-validator';

/* ================= UPDATE PROFILE ================= */

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}

/* ================= CHANGE PASSWORD ================= */

export class ChangePasswordDto {
  @IsString()
  oldPassword: string;

  @MinLength(6)
  newPassword: string;
}

/* ================= REQUEST EMAIL CHANGE ================= */

export class RequestEmailChangeDto {
  @IsEmail()
  newEmail: string;
}

/* ================= VERIFY EMAIL CHANGE ================= */

export class VerifyEmailChangeDto {
  @IsString()
  otp: string;
}
