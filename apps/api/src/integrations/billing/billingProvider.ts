import { Plan, SubscriptionStatus } from '@taskflow/shared';

/**
 * Provider-neutral interface for future billing & subscription management.
 * Note: No payment gateway (Stripe, Razorpay, Paddle, etc.) is implemented in PR27.
 * TaskFlow domain architecture relies purely on internal subscription state.
 */
export interface CheckoutSessionParams {
  organizationId: string;
  plan: Plan;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
}

export interface ExternalSubscription {
  id: string;
  organizationId: string;
  plan: Plan;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export interface BillingWebhookEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
}

export interface IBillingProvider {
  createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult>;
  cancelSubscription(subscriptionId: string): Promise<ExternalSubscription>;
  getSubscription(subscriptionId: string): Promise<ExternalSubscription | null>;
  handleWebhook(rawBody: string | Buffer, signature: string): Promise<BillingWebhookEvent>;
}
