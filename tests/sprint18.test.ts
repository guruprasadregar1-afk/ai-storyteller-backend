import { BillingService } from '../src/services/BillingService';

describe('Sprint 18 Backend Test Suite — Monetization & Billing Gateway (BE-123 to BE-128)', () => {
  let billingService: BillingService;

  beforeEach(() => {
    billingService = new BillingService();
  });

  test('BE-123: Retrieve default FREE tier subscription for new user', () => {
    const sub = billingService.getSubscription('user-1801');

    expect(sub.tier).toBe('FREE');
    expect(sub.tokenQuota).toBe(1000);
    expect(sub.tokensUsed).toBe(0);
    expect(sub.status).toBe('ACTIVE');
  });

  test('BE-124: Meter token consumption deductions accurately', () => {
    const updated = billingService.consumeTokens('user-1802', 300);

    expect(updated.tokensUsed).toBe(300);

    const usage = billingService.getUsage('user-1802');
    expect(usage.remaining).toBe(700);
    expect(usage.usagePercent).toBe(30);
  });

  test('BE-125: Throw error when token quota is exceeded', () => {
    expect(() => {
      billingService.consumeTokens('user-1803', 1500);
    }).toThrow(/Insufficient tokens/);
  });

  test('BE-126 & BE-128: Create checkout session and upgrade subscription tier to PRO / ENTERPRISE', () => {
    const session = billingService.createCheckoutSession('user-1804', 'PRO');

    expect(session.checkoutUrl).toContain('stripe.com');
    expect(session.amountUsd).toBe(29);

    const updatedSub = billingService.getSubscription('user-1804');
    expect(updatedSub.tier).toBe('PRO');
    expect(updatedSub.tokenQuota).toBe(50000);
  });

  test('BE-127: Return correct usage summary stats', () => {
    billingService.consumeTokens('user-1805', 500);
    const stats = billingService.getUsage('user-1805');

    expect(stats.used).toBe(500);
    expect(stats.remaining).toBe(500);
    expect(stats.usagePercent).toBe(50);
  });
});
