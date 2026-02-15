import { Order } from "src/database/prisma-client/client";

export interface IShippingInfo {
  fullName: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
}

export interface IPaymentData {
  sourceId: string;
  amount: number;
  artworkId: string;
  shippingInfo: IShippingInfo;
  auctionId?: string; // Optional, only for auction purchases
  orderId?: string;   // Optional, only for auction purchases
// Add userId to the payment data
}

