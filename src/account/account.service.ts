import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { UploadService } from 'src/upload/upload.service';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AccountService {
  constructor(
    private prisma: PrismaService,
    private upload: UploadService,
    private mail: MailService,
  ) {}

  // ========= GET PROFILE =========
  async getMyProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        bio: true,
        location: true,
        dateOfBirth: true,
        profilePictureUrl: true,
        createdAt: true,
        updatedAt: true,
        blockedUsers: {
          select: {
            blockedId: true,
          },
        },
      },
    });
  }

  // ========= UPDATE PROFILE =========
  async updateProfile(userId: string, dto: any, files: any) {
    let profilePictureUrl: string | undefined;

    if (files?.artworkImage?.[0]) {
      profilePictureUrl = await this.upload.uploadSingleImage(
        files.artworkImage[0],
      );
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...dto,
        ...(profilePictureUrl && { profilePictureUrl }),
      },
    });
  }

  // ========= CHANGE PASSWORD =========
  async changePassword(userId: string, dto: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const match = await bcrypt.compare(
      dto.oldPassword,
      user.password as string,
    );

    if (!match) throw new BadRequestException('Old password incorrect');

    const hashed = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { message: 'Password updated successfully' };
  }

  // ========= REQUEST EMAIL CHANGE =========
  async requestEmailChange(userId: string, newEmail: string) {
    // check BOTH email & pendingEmail
    const exists = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: newEmail }, { email: newEmail }],
      },
    });

    if (exists) throw new BadRequestException('Email already in use');

    const otp = randomInt(100000, 999999).toString();

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        pendingEmail: newEmail,
        otp,
        otpType: 'emailChange',
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    console.log('Otp for old email', otp);

    /*
      SEND OTP TO OLD EMAIL VIA NODEMAILER HERE
    */
    await this.mail.sendOldEmailVerifyOtp(user.email, otp);

    return { message: 'OTP sent to old email' };
  }

  // ========= VERIFY OLD EMAIL =========
  async verifyOldEmail(userId: string, otp: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.otp || !user.otpExpiry)
      throw new BadRequestException('No active OTP');

    if (user.otp !== otp) throw new BadRequestException('Invalid OTP');

    if (user.otpExpiry < new Date())
      throw new BadRequestException('OTP expired');

    const newOtp = randomInt(100000, 999999).toString();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        otp: newOtp,
        otpType: 'newEmailVerification',
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await this.mail.sendNewEmailVerifyOtp(user.pendingEmail as string, newOtp);
    console.log('otp on new email', newOtp);

    return { message: 'Old email verified' };
  }

  // ========= VERIFY NEW EMAIL =========

  async verifyNewEmail(userId: string, otp: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new BadRequestException('User not found');

    if (!user?.pendingEmail) throw new BadRequestException('No pending email');

    if (user.otp !== otp) throw new BadRequestException('Invalid OTP');
    if (user.otpType !== 'newEmailVerification')
      throw new BadRequestException('Invalid OTP ');

    const otpExpiry = user.otpExpiry as Date;

    if (otpExpiry < new Date()) throw new BadRequestException('OTP expired');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: user.pendingEmail,
        pendingEmail: null,
        otp: null,
        otpExpiry: null,
        otpType: null,
      },
    });

    return { message: 'Email updated successfully' };
  }

  // ========= BLOCK / UNBLOCK =========
  async blockUnblock(myId: string, otherId: string) {
    const exists = await this.prisma.userBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: myId,
          blockedId: otherId,
        },
      },
    });

    if (exists) {
      await this.prisma.userBlock.delete({
        where: { id: exists.id },
      });

      return { message: 'User unblocked' };
    }

    await this.prisma.userBlock.create({
      data: {
        blockerId: myId,
        blockedId: otherId,
      },
    });

    return { message: 'User blocked' };
  }

  /* =====================================================
   GET OTHER USER PUBLIC PROFILE
===================================================== */

  async getOtherUserProfile(userId: string, myUserId?: string) {
    console.log(myUserId)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        bio: true,
        location: true,
        profilePictureUrl: true,

        _count: {
          select: {
            sentConnections: {
              where: { status: 'ACCEPTED' },
            },
            receivedConnections: {
              where: { status: 'ACCEPTED' },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    let chatId: string | null = null;

    if (myUserId) {
      const chat = await this.prisma.chat.findFirst({
        where: {
          AND: [
            {
              participants: {
                some: { userId: myUserId },
              },
            },
            {
              participants: {
                some: { userId },
              },
            },
          ],
        },
        select: { id: true },
      });

      chatId = chat?.id || null;
    }

    return {
      ...user,
      connectionsCount:
        user._count.sentConnections + user._count.receivedConnections,
      chatId,
    };
  }

  async getMyBoughtArtworks(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { buyerId: userId },
      include: {
        artwork: {
          select: {
            title: true,
            imageUrl: true,
          },
        },
      },
    });
    if (!orders) throw new NotFoundException('No orders found');
    return orders;
  }
  async getMyBlockedUsers(userId: string) {
    const blocks = await this.prisma.userBlock.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    return blocks.map((b) => b.blocked);
  }
}
