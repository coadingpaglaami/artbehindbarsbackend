import { User } from 'src/database/prisma-client/client';

export type SignUpDtoRequestDto = Pick<
  User,
  'email' | 'password' | 'firstName' | 'lastName' | 'dateOfBirth' | 'role'
>;
export type LoginRequestDto = Pick<User, 'email' | 'password'>;
export type ForgetPasswordRequestDto = Pick<User, 'email'>;
export type ResetPasswordRequestDto = {
  password: string;
  confirmPassword: string;
  email: string;
};
export type OTPRequestDto = {
  email: string;
  otp: string;
  otpType: Pick<User, 'otpType'>;
};

export type RefreshTokenRequestDto = {
  refreshToken: string;
};

export type UserResponseDto = Pick<
  User,
  | 'id'
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'role'
  | 'dateOfBirth'
  | 'createdAt'
  | 'updatedAt'
>;

/* ---------- Auth ---------- */
export type SignUpResponseDto = {
  user: UserResponseDto;
  message: string;
};

export type LoginResponseDto = {
  user: UserResponseDto;
  accessToken: string;
  refreshToken: string;
  
};

export type RefreshTokenResponseDto = {
  accessToken: string;
  refreshToken: string;
};

/* ---------- Password / OTP ---------- */
export type ForgetPasswordResponseDto = {
  message: string;
};

export type OTPResponseDto = {
  email: string;
  otpType: 'signup' | 'resetPassword';
  verified: boolean;
};

export type ResetPasswordResponseDto = {
  message: string;
};