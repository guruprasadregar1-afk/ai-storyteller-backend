import { SubscriptionItem, CheckoutSessionItem } from '../types';

export class BillingService {
  private subscriptionsStore: Map<string, SubscriptionItem> = new Map();

  getSubscription(userId: string): SubscriptionItem {
    let sub = this.subscriptionsStore.get(userId);
    if (!sub) {
      sub = {
        id: `sub-${userId}`,
        userId,
        tier: 'FREE',
        tokenQuota: 1000,
        tokensUsed: 0,
        status: 'ACTIVE'
      };
      this.subscriptionsStore.set(userId, sub);
    }
    return sub;
  }

  consumeTokens(userId: string, tokens: number): SubscriptionItem {
    const sub = this.getSubscription(userId);
    const available = sub.tokenQuota - sub.tokensUsed;

    if (tokens > available) {
      throw new Error(`Insufficient tokens balance. Required: ${tokens}, Available: ${available}`);
    }

    sub.tokensUsed += tokens;
    this.subscriptionsStore.set(userId, sub);
    console.log(`[BillingService] Consumed ${tokens} tokens for user '${userId}' (${sub.tokensUsed}/${sub.tokenQuota})`);
    return sub;
  }

  createCheckoutSession(userId: string, targetTier: 'PRO' | 'ENTERPRISE'): CheckoutSessionItem {
    const amountUsd = targetTier === 'PRO' ? 29 : 199;
    const sessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    console.log(`[BillingService] Creating checkout session for user '${userId}' -> Tier '${targetTier}' ($${amountUsd})`);

    // Upgrade subscription quota immediately upon checkout simulation
    const sub = this.getSubscription(userId);
    sub.tier = targetTier;
    sub.tokenQuota = targetTier === 'PRO' ? 50000 : 500000;
    this.subscriptionsStore.set(userId, sub);

    return {
      checkoutUrl: `https://checkout.stripe.com/pay/${sessionId}`,
      sessionId,
      tier: targetTier,
      amountUsd
    };
  }

  getUsage(userId: string): { tier: string; quota: number; used: number; remaining: number; usagePercent: number } {
    const sub = this.getSubscription(userId);
    const remaining = sub.tokenQuota - sub.tokensUsed;
    const usagePercent = Math.round((sub.tokensUsed / sub.tokenQuota) * 100);

    return {
      tier: sub.tier,
      quota: sub.tokenQuota,
      used: sub.tokensUsed,
      remaining,
      usagePercent
    };
  }
}
