import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { AdminReplyDto, CreateContactDto } from './dto/contact.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';

import { PaginatedResponseDto } from 'src/common/dto/pagination-response.dto';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class ContactUsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async createContact(dto: CreateContactDto) {
    const message = await this.prisma.contactMessage.create({
      data: dto,
    });

    return {
      message: 'Message sent successfully',
      data: message,
    };
  }

  async getAllMessages(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [total, messages] = await Promise.all([
      this.prisma.contactMessage.count(),
      this.prisma.contactMessage.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: messages,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async replyToMessage(id: string, dto: AdminReplyDto) {
    const message = await this.prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.adminReply) {
      throw new BadRequestException('Already replied to this message');
    }

    const updated = await this.prisma.contactMessage.update({
      where: { id },
      data: {
        adminReply: dto.reply,
        repliedAt: new Date(),
      },
    });

    // Send email to user
    await this.mailService.sendAdminReplyEmail(
      message.email,
      message.name,
      dto.reply,
    );

    return {
      message: 'Reply sent successfully',
      data: updated,
    };
  }
}
