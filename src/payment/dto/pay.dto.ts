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
}