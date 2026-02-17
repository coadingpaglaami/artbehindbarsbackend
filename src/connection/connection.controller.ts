import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Patch,
  Param,
  Delete,
  Get,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConnectionService } from './connection.service';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { CreateConnectionDto } from './connection.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('connections')
export class ConnectionController {
  constructor(private readonly service: ConnectionService) {}

  // Send connection request
  @Post()
  sendRequest(@Req() req: any, @Body() dto: CreateConnectionDto) {
    return this.service.sendRequest(req.user.sub, dto.receiverId);
  }

  // Accept request
  @Patch(':id/accept')
  accept(@Req() req: any, @Param('id') connectionId: string) {
    return this.service.acceptRequest(req.user.sub, connectionId);
  }

  // Reject request
  @Patch(':id/reject')
  reject(@Req() req: any, @Param('id') connectionId: string) {
    return this.service.rejectRequest(req.user.sub, connectionId);
  }

  // Disconnect
  @Delete(':id')
  disconnect(@Req() req: any, @Param('id') connectionId: string) {
    return this.service.disconnect(req.user.sub, connectionId);
  }

  // Incoming requests
  @Get('requests')
  getRequests(@Req() req: any, @Query() query: PaginationQueryDto) {
    return this.service.getIncomingRequests(req.user.sub, query);
  }

  // My Requests
  @Get('my-requests')
  getMyRequests(@Req() req: any, @Query() query: PaginationQueryDto) {
    return this.service.getMyRequests(req.user.sub, query);
  }

  // My connections
  @Get()
  getMyConnections(@Req() req: any, @Query() query: PaginationQueryDto) {
    return this.service.getMyConnections(req.user.sub, query);
  }

  @Get(':id/status')
  getStatus(@Req() req: any, @Param('id') userId: string) {
    return this.service.getConnectionStatus(req.user.sub, userId);
  }
}
