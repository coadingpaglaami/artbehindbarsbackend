import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuctionService } from './auction.service';
import { Roles } from 'src/role/decorators/role.decorator';
import { AuthGuard } from '@nestjs/passport';
import {
  CreateAuctionDto,
  GetAuctionsQueryDto,
  PlaceBidDto,
} from './dto/auction.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

@Controller('auction')
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}
  @Post('create')
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
}
