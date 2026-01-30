import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';

import type {
  ForgetPasswordRequestDto,
  LoginRequestDto,
  OTPRequestDto,
  RefreshTokenRequestDto,
  ResetPasswordRequestDto,
  SignUpDtoRequestDto,
} from './dto/auth.dto';

import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/signup
  @Post('signup')
  signup(@Body() dto: SignUpDtoRequestDto) {
    return this.authService.signup(dto);
  }

  // POST /auth/signup/email_verify
  @Post('signup/email_verify')
  signupEmailVerify(@Body() dto: OTPRequestDto) {
    return this.authService.signupEmailVerify(dto);
  }

  // POST /auth/signin
  @Post('signin')
  signin(@Body() dto: LoginRequestDto) {
    return this.authService.signin(dto);
  }

  // POST /auth/forget-passsword
  @Post('forget-passsword')
  forgetPassword(@Body() dto: ForgetPasswordRequestDto) {
    return this.authService.forgetPassword(dto);
  }

  // POST /auth/forget/email_verify
  @Post('forget/email_verify')
  forgetEmailVerify(@Body() dto: OTPRequestDto) {
    return this.authService.forgetEmailVerify(dto);
  }

  // POST /auth/reset-password
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordRequestDto) {
    return this.authService.resetPassword(dto);
  }

  // POST /auth/refresh_token
  @Post('refresh_token')
  refreshToken(@Body() dto: RefreshTokenRequestDto) {
    return this.authService.refreshToken(dto);
  }

  // GET /auth/google
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // redirects to google
  }

  // GET /auth/google/callback
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: any) {
    return this.authService.googleLogin(req);
  }
}
