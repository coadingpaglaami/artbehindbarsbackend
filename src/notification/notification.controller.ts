import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getMyNotifications(@Req() req: any) {
    const userId = req.user.sub; // Assuming user ID is stored in req.user.sub after authentication
    console.log('Fetching notifications for user:', userId);
    return this.notificationService.getMyNotifications(userId);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  // 3️⃣ Mark all notifications as read
  @Patch('read/all')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.sub;
    return this.notificationService.markAllAsRead(userId);
  }

  // 4️⃣ Delete a notification
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.notificationService.delete(id);
  }
}
