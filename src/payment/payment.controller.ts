import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import type { IPaymentData } from './dto/pay.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}
  @Post('checkout')
  @UseGuards(AuthGuard('jwt'))
  async checkout(@Body() paymentData: IPaymentData, @Req() req: any) {
    // amount should be in cents (e.g., 1000 = $10.00)
    console.log(paymentData,"<--- Received payment data in controller");
    return await this.paymentService.createPayment(paymentData, req.user.sub);
  }

  @Get('admin-stats')
  async getAdminStats() {
    const now = new Date();

    // Dates for CURRENT month
    const startOfCurrent = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).toISOString();
    const endOfCurrent = now.toISOString();

    // Dates for PREVIOUS month
    const startOfLast = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    ).toISOString();
    const endOfLast = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    ).toISOString();

    const [currentPayments, lastPayments] = await Promise.all([
      this.paymentService.getMonthlyStats(startOfCurrent, endOfCurrent),
      this.paymentService.getMonthlyStats(startOfLast, endOfLast),
    ]);

    // Helper to calculate totals
    const calculateTotals = (payments: any[]) => {
      const totalRevenueCents = payments.reduce(
        (sum, p) => sum + Number(p.amountMoney.amount),
        0,
      );
      return {
        revenue: totalRevenueCents / 100, // Convert cents to dollars
        salesCount: payments.length,
      };
    };

    const currentStats = calculateTotals(currentPayments);
    const lastStats = calculateTotals(lastPayments);

    return {
      dashboard: {
        currentMonth: currentStats,
        lastMonth: lastStats,
        revenueComparison: {
          difference: currentStats.revenue - lastStats.revenue,
          isGrowth: currentStats.revenue >= lastStats.revenue,
        },
      },
    };
  }

  @Get('order/:id')
  @UseGuards(AuthGuard('jwt'))
  async getOrder(@Param('id') id: string) {
    return await this.paymentService.getOrderById(id);
  }
}
