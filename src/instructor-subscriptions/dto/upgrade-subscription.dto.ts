export interface UpgradeSubscriptionDto {
  planId: string;
  paymentMethod?: string;
  metadata?: Record<string, any>;
}
