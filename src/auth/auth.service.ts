import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailService } from 'src/mail/mail.service';

import {
  ForgetPasswordRequestDto,
  ForgetPasswordResponseDto,
  LoginRequestDto,
  LoginResponseDto,
  OTPRequestDto,
  OTPResponseDto,
  RefreshTokenRequestDto,
  RefreshTokenResponseDto,
  ResetPasswordRequestDto,
  ResetPasswordResponseDto,
  SignUpDtoRequestDto,
  SignUpResponseDto,
  UserResponseDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  // ===============================
  //  Private reusable functions
  // ===============================

  private mapUserResponse(user: any): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      dateOfBirth: user.dateOfBirth,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit
  }

  private getOtpExpiry(minutes = 5): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  /**
   * This function will be reused in:
   * - signup email verify
   * - forget password email verify
   */
  private async verifyOtpOrThrow(email: string, otp: string, otpType: any) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) throw new NotFoundException('User not found');

    if (!user.otp || !user.otpExpiry || !user.otpType) {
      throw new BadRequestException('OTP not generated');
    }

    if (user.otpType !== otpType) {
      throw new BadRequestException('OTP type mismatch');
    }

    if (user.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (new Date() > new Date(user.otpExpiry)) {
      throw new BadRequestException('OTP expired');
    }

    return user;
  }

  private async generateTokens(payload: any) {
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '5h',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  // ===============================
  // Signup
  // ===============================

  async signup(dto: SignUpDtoRequestDto): Promise<SignUpResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists with this email');
    }

    const hashedPassword = await bcrypt.hash(dto.password as string, 10);

    const otp = this.generateOtp();
    const otpExpiry = this.getOtpExpiry(5);
    console.log(otp);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: new Date(dto.dateOfBirth),
        role: dto.role ?? 'USER',
        password: hashedPassword,
        otp,
        otpExpiry,
        otpType: 'signup',
      },
    });

    await this.mailService.sendSignupOtpMail(user.email, otp);

    return {
      user: this.mapUserResponse(user),
      message: 'Signup successful. Please verify your email using OTP.',
    };
  }

  async signupEmailVerify(dto: OTPRequestDto): Promise<OTPResponseDto> {
    const user = await this.verifyOtpOrThrow(dto.email, dto.otp, 'signup');

    // clear otp after verify
    const updatedUser = await this.prisma.user.update({
      where: { email: dto.email },
      data: {
        otp: null,
        otpExpiry: null,
        otpType: null,
      },
    });
    const payload = {
      sub: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    };
    const { accessToken, refreshToken } = await this.generateTokens(payload);
    return {
      accessToken,
      refreshToken,
      email: updatedUser.email,
      otpType: 'signup',
      verified: true,
    };
  }

  // ===============================
  // Login
  // ===============================

  async signin(dto: LoginRequestDto): Promise<LoginResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password as string, user.password);

    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const { accessToken, refreshToken } = await this.generateTokens(payload);

    return {
      user: this.mapUserResponse(user),
      accessToken,
      refreshToken,
    };
  }

  // ===============================
  //  Forget Password
  // ===============================

  async forgetPassword(
    dto: ForgetPasswordRequestDto,
  ): Promise<ForgetPasswordResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new NotFoundException('User not found');

    const otp = this.generateOtp();
    const otpExpiry = this.getOtpExpiry(5);
    console.log(otp);

    await this.prisma.user.update({
      where: { email: dto.email },
      data: {
        otp,
        otpExpiry,
        otpType: 'resetPassword',
      },
    });

    await this.mailService.sendForgotPasswordOtpMail(dto.email, otp);

    return {
      message: 'OTP sent to email for password reset',
    };
  }

  async forgetEmailVerify(dto: OTPRequestDto): Promise<OTPResponseDto> {
    const user = await this.verifyOtpOrThrow(
      dto.email,
      dto.otp,
      'resetPassword',
    );

    // Do NOT clear OTP here if you want resetPassword after verification
    // But safer: clear OTP only after resetPassword.
    return {
      email: user.email,
      otpType: 'resetPassword',
      verified: true,
    };
  }

  async resetPassword(
    dto: ResetPasswordRequestDto,
  ): Promise<ResetPasswordResponseDto> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password and confirm password mismatch');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new NotFoundException('User not found');

    if (!user.otpType || user.otpType !== 'resetPassword') {
      throw new ForbiddenException('OTP verification required');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.update({
      where: { email: dto.email },
      data: {
        password: hashedPassword,
        otp: null,
        otpExpiry: null,
        otpType: null,
      },
    });

    return {
      message: 'Password reset successful',
    };
  }

  // ===============================
  //  Refresh Token
  // ===============================

  async refreshToken(
    dto: RefreshTokenRequestDto,
  ): Promise<RefreshTokenResponseDto> {
    try {
      const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: process.env.JWT_SECRET,
      });

      const newPayload = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      const { accessToken, refreshToken } =
        await this.generateTokens(newPayload);

      return { accessToken, refreshToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ===============================
  //  Google OAuth
  // ===============================

  async googleLogin(req: any) {
    // user comes from GoogleStrategy validate()
    const googleUser = req.user;

    if (!googleUser?.email) {
      throw new BadRequestException('Google login failed: email not found');
    }

    // find or create user
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          firstName: googleUser.firstName ?? 'Unknown',
          lastName: googleUser.lastName ?? 'User',
          dateOfBirth: googleUser.dateOfBirth
            ? new Date(googleUser.dateOfBirth)
            : new Date('2000-01-01'),
          oauthProvider: 'google',
          role: 'USER',
        },
      });
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const { accessToken, refreshToken } = await this.generateTokens(payload);

    return {
      user: this.mapUserResponse(user),
      accessToken,
      refreshToken,
    };
  }
}
