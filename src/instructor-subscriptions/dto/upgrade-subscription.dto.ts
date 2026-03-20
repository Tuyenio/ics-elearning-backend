export interface UpgradeSubscriptionDto {
  planId: string;
  paymentMethod?: string;
  paymentMethodId?: string;
  paymentChannel?: string;
  metadata?: Record<string, any>;
}
