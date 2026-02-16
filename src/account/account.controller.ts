import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AccountService } from './account.service';
import {
  ChangePasswordDto,
  RequestEmailChangeDto,
  UpdateProfileDto,
  VerifyEmailChangeDto,
} from './dto/account.dto';

@Controller('account')
@UseGuards(AuthGuard('jwt'))
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  // ================= GET MY PROFILE =================
  @Get('me')
  getMyProfile(@Req() req:any) {
    return this.accountService.getMyProfile(req.user.sub);
  }

  // ================= UPDATE PROFILE =================
  @Patch('profile')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'artworkImage', maxCount: 1 }]),
  )
  updateProfile(
    @Req() req,
    @Body() dto: UpdateProfileDto,
    @UploadedFiles()
    files: {
      artworkImage?: Express.Multer.File[];
    },
  ) {
    return this.accountService.updateProfile(req.user.sub, dto, files);
  }

  // ================= CHANGE PASSWORD =================
  @Patch('password')
  changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    return this.accountService.changePassword(req.user.sub, dto);
  }

  // ================= REQUEST EMAIL CHANGE (OLD EMAIL OTP) =================
  @Patch('email/request')
  requestEmailChange(@Req() req:any, @Body() dto: RequestEmailChangeDto) {
    return this.accountService.requestEmailChange(req.user.sub, dto.newEmail);
  }

  // ================= VERIFY OLD EMAIL OTP =================
  @Patch('email/verify-old')
  verifyOldEmail(@Req() req, @Body() dto: VerifyEmailChangeDto) {
    return this.accountService.verifyOldEmail(req.user.sub, dto.otp);
  }

  // ================= VERIFY NEW EMAIL OTP =================
  @Patch('email/verify-new')
  verifyNewEmail(@Req() req, @Body() dto: VerifyEmailChangeDto) {
    return this.accountService.verifyNewEmail(req.user.sub, dto.otp);
  }

  // ================= BLOCK / UNBLOCK USER =================
  @Patch('block/:userId')
  blockUnblock(@Req() req, @Param('userId') userId: string) {
    return this.accountService.blockUnblock(req.user.sub, userId);
  }

  @Get(':id/profile')
  getOtherUserProfile(@Param('id') userId: string ,@Req() req?:any) {
    return this.accountService.getOtherUserProfile(userId,req?.user?.sub);
  }
  @Get('my-blocked-users')
  async getMyBlockedUsers(@Req() req) {
    return this.accountService.getMyBlockedUsers(req.user.sub);
  }
  @Get('mybought-artworks')
  async getMyBoughtArtworks(@Req() req) {
    return this.accountService.getMyBoughtArtworks(req.user.sub);
  }
}
