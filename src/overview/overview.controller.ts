import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { OverviewService } from './overview.service';
import { Roles } from 'src/role/decorators/role.decorator';
import { AuthGuard } from '@nestjs/passport';

@Controller('overview')
@Roles(['ADMIN'])
@UseGuards(AuthGuard('jwt'))
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}
  @Get()
  async getTotalOverview() {
    return await this.overviewService.getTotalOverview();
  }

  @Get('revenue-trends')
  async getRevenueTrends() {
    return await this.overviewService.getRevenueTrends();
  }

  @Get('top-artists')
  async getTopArtists() {
    return await this.overviewService.getTopArtists();
  }

  @Get('artworkby-category')
  async getArtworkCategoryStats() {
    return await this.overviewService.getArtworkCategoryStats();
  }

  @Get('auction-performance')
  async getAuctionPerformance(
    @Query('timeframe') timeframe: 'Upcoming' | 'Ongoing' | 'Ended',
  ) {
    return await this.overviewService.getAuctionPerformance(timeframe);
  }
}
