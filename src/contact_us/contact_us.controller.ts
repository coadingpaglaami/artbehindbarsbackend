import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ContactUsService } from './contact_us.service';
import { AdminReplyDto, CreateContactDto } from './dto/contact.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/role/decorators/role.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

@Controller('contact-us')
export class ContactUsController {
  constructor(private readonly contactService: ContactUsService) {}
  @Post()
  create(@Body() dto: CreateContactDto) {
    return this.contactService.createContact(dto);
  }

  // ==========================
  // ADMIN: Get All Messages
  // ==========================
  @UseGuards(AuthGuard('jwt'))
  @Roles(['ADMIN'])
  @Get('admin')
  getAll(@Query() query: PaginationQueryDto) {
    return this.contactService.getAllMessages(query);
  }

  // ==========================
  // ADMIN: Reply to Message
  // ==========================
  @UseGuards(AuthGuard('jwt'))
  @Roles(['ADMIN'])
  @Patch('admin/reply/:id')
  reply(@Param('id') id: string, @Body() dto: AdminReplyDto) {
    return this.contactService.replyToMessage(id, dto);
  }
}
