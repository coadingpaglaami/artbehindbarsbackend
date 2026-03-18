import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';

import type {
  ForgetPasswordRequestDto,
  LoginRequestDto,
  OTPRequestDto,
  ResetPasswordRequestDto,
  SignUpDtoRequestDto,
} from './dto/auth.dto';

import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';

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
  async signupEmailVerify(@Body() dto: OTPRequestDto, @Res() res: Response) {
    const { accessToken, refreshToken } =
      await this.authService.signupEmailVerify(dto);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: '.theartofreform.com',
      path: '/',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: '.theartofreform.com',
      path: '/',
    });

    return res.json({ success: true });
  }

  // POST /auth/signin
  @Post('signin')
  async signin(@Body() dto: LoginRequestDto, @Res() res: Response) {
    const { accessToken, refreshToken } = await this.authService.signin(dto);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: '.theartofreform.com',
      path: '/',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: '.theartofreform.com',
      path: '/',
    });

    return res.json({ success: true });
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
  async refreshToken(@Req() req: any, @Res() res: Response) {
    const refreshToken = req.cookies?.refreshToken;

    const tokens = await this.authService.refreshToken(refreshToken);

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: '.theartofreform.com',
      path: '/',
    });

    return res.json({ success: true });
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
  async googleCallback(@Req() req: any, @Res() res: Response) {
    console.log(req.user, 'user');
    const result = await this.authService.googleLogin(req);
    const { accessToken, refreshToken } = result;
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: '.theartofreform.com',
      path: '/',
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: '.theartofreform.com',
      path: '/',
    });
    return res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000'); // Redirect to frontend after successful login
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@Req() req: any) {
    return req.user;
  }

  @Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie('accessToken', {
      domain: '.theartofreform.com',
      path: '/',
    });

    res.clearCookie('refreshToken', {
      domain: '.theartofreform.com',
      path: '/',
    });

    return res.json({ success: true });
  }
}
