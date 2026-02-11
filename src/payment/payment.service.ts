import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SquareClient, SquareEnvironment, SquareError } from 'square'; // New names
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentService {
  private client: SquareClient;

  constructor() {
    this.client = new SquareClient({
      token: process.env.SANDBOX_ACCESS_TOKEN,
      environment: SquareEnvironment.Sandbox,
    });
  }

  async createPayment(sourceId: string, amount: number) {
    try {
         const integerAmount = Math.round(amount); 
         
         const amountBigInt = BigInt(integerAmount);
         console.log(typeof amountBigInt)
      // Note: '.payments.create' instead of '.paymentsApi.createPayment'
      const { payment } = await this.client.payments.create({
        idempotencyKey: uuidv4(),
        sourceId,
        amountMoney: {
          amount: amountBigInt, // Square API expects amount as a string or BigInt
          currency: 'USD',
        },
      });
      return this.serializeBigInt(payment);
    } catch (error) {
      if (error instanceof SquareError) {
        console.error(error.errors);
      }
      throw new InternalServerErrorException('Square API Error');
    }
  }

  async getMonthlyStats(start: string, end: string) {
    try {
      const { data } = await this.client.payments.list({
        beginTime: start,
        endTime: end,
      });
      return this.serializeBigInt(data || []);
    } catch (error) {
      if (error instanceof SquareError) {
        console.error(error.errors);
      }
      throw new InternalServerErrorException('Square API Error');
    }
  }

  private serializeBigInt(obj: any) {
    return JSON.parse(
      JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }
}