import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { ProgressService } from './progress.service';
import { Roles } from 'src/role/decorators/role.decorator';
@Controller()
@Roles(['ADMIN'])
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('member-engagement')
  async getDashboard() {
    const stats = await this.progressService.getUserStatusStats();
    const trend = await this.progressService.getEngagementTrend();
    const avgScore = await this.progressService.getAverageScore();

    return {
      ...stats,
      averageScore: avgScore,
      engagementTrend: trend,
    };
  }

  @Get('user-activities')
  async getUserActivities(@Query() query: { page?: number; limit?: number,search?: string }) {
    return this.progressService.getUsersEngagement(query);
  }
}
