import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuctionService } from './auction.service';
import { Roles } from 'src/role/decorators/role.decorator';
import { AuthGuard } from '@nestjs/passport';
import {
  CreateAuctionDto,
  ExtendAuctionDto,
  GetAuctionsQueryDto,
  PlaceBidDto,
} from './dto/auction.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

@Controller('auction')
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}
  @Post('create')
  @UseGuards(AuthGuard('jwt'))
  @Roles(['ADMIN'])
  async createAuction(@Body() dto: CreateAuctionDto) {
    return this.auctionService.createAuction(dto);
  }

  // User places bid
  @Post('bid')
  @UseGuards(AuthGuard('jwt'))
  async placeBid(@Req() req: any, @Body() dto: PlaceBidDto) {
    return this.auctionService.placeBid(req.user.sub, dto);
  }

  // Get auction info
  @Get(':id')
  async getAuction(@Param('id') id: string) {
    return this.auctionService.getAuction(id);
  }

  @Get('my/history')
  @UseGuards(AuthGuard('jwt'))
  async getMyAuctionHistory(
    @Req() req: any,
    @Query() query: PaginationQueryDto,
  ) {
    return this.auctionService.getUserAuctionHistory(req.user.sub, query);
  }

  @Patch(':id/extend')
  @UseGuards(AuthGuard('jwt'))
  @Roles(['ADMIN'])
  extend(@Param('id') auctionId: string, @Body() dto: ExtendAuctionDto) {
    return this.auctionService.extendAuction(auctionId, dto.newEndAt);
  }

  // Get paginated bids
  @Get(':id/bids')
  @UseGuards(AuthGuard('jwt'))
  async getAuctionBids(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.auctionService.getAuctionBids(id, query);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @Roles(['ADMIN'])
  async getAllAuctions(@Query() query: GetAuctionsQueryDto) {
    return this.auctionService.getAllAuctions(query);
  }
  @Get(':id/order')
  @UseGuards(AuthGuard('jwt'))
  async getOrderByAuctionId(@Param('id') auctionId: string) {
    return this.auctionService.getOrderByAuctionId(auctionId);
  }

  @Cron('*/30 * * * * *') // every 30 seconds (for testing)
  async suspendUnpaidUsers() {
    await this.auctionService.suspendUnpaidUsers();
  }
  @Cron(CronExpression.EVERY_MINUTE)
  async updateAuctionStatuses() {
    await this.auctionService.updateAuctionStatuses();
  }
}


