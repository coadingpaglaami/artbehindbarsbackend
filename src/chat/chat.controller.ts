import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { AuthGuard } from '@nestjs/passport';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';


@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // Create or get chat with another user
  @Post('with/:userId')
  async getOrCreateChat(@Req() req: any, @Param('userId') userId: string) {
    return this.chatService.getOrCreateChat(req.user.sub, userId);
  }

  // Get all chats for logged-in user
  @Get()
  getMyChats(@Req() req: any,@Query() pagination: PaginationQueryDto) {
    return this.chatService.getUserChats(req.user.sub,pagination);
  }

  // Get messages of a chat
  @Get(':chatId/messages')
  async getMessages(@Req() req: any, @Param('chatId') chatId: string) {
    return this.chatService.getMessages(req.user.sub, chatId);
  }

  // Send message z
  @Post(':chatId/message')
  async sendMessage(
    @Req() req: any,
    @Param('chatId') chatId: string,
    @Body('content') content: string,
  ) {
    return this.chatService.sendMessage(req.user.sub, chatId, content);
  }

  // Mark all unseen messages as seen
  @Post(':chatId/seen')
  async markAsSeen(@Req() req: any, @Param('chatId') chatId: string) {
    return this.chatService.markAsSeen(req.user.sub, chatId);
  }
}
