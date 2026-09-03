import { LanguageValidationService } from '../src/services/LanguageValidationService';

describe('Template opener guard — content similarity, not opener-only', () => {
  test('allows repeated speaker attribution when dialogue bodies differ (Bagheera case)', () => {
    const text = [
      'बाघीरा ने कहा, "ये शब्द याद रखना — ये तुम्हारी जान बचाएंगे।"',
      'गहरी जंगल में मोगली ने लाल फूल उठाया।',
      'बाघीरा ने कहा, "तुमने वो किया जो कोई भेड़िया नहीं कर सकता था, मोगली।"',
    ].join('\n\n');

    const result = LanguageValidationService.validateTextLanguage(text, 'hi');
    expect(result.isValid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  test('rejects lazy template when opener AND body are near-duplicates', () => {
    const filler =
      'एक छोटे से गाँव में एक बहादुर लड़का रहता था जो हर दिन जंगल में जाता था और सभी जानवरों से दोस्ती करता था';
    const text = [
      `एक समय की बात है, ${filler} और सबको खुश रखता था।`,
      `एक समय की बात है, ${filler} और सबको प्रसन्न रखता था।`,
    ].join('\n\n');

    const result = LanguageValidationService.validateTextLanguage(text, 'hi');
    expect(result.isValid).toBe(false);
    expect(result.reason).toMatch(/HARDCODED_TEMPLATE_OPENER_DETECTED/);
  });

  test('rejects identical paragraphs even with narrative opener', () => {
    const duplicate =
      'राजा ने घोषणा की कि प्रजा को कोई भी कष्ट नहीं होगा और सभी को समान अधिकार मिलेंगे।';
    const text = `${duplicate}\n\n${duplicate}`;

    const result = LanguageValidationService.validateTextLanguage(text, 'hi');
    expect(result.isValid).toBe(false);
    expect(result.reason).toMatch(/HARDCODED_TEMPLATE_OPENER_DETECTED/);
  });

  test('computeTextSimilarity distinguishes distinct vs duplicate bodies', () => {
    const a = 'ये शब्द याद रखना वे तुम्हारी जान बचाएंगे';
    const b = 'तुमने वो किया जो कोई भेड़िया नहीं कर सकता था मोगली';
    const c = 'ये शब्द याद रखना वे तुम्हारी जान बचाएंगे हमेशा';

    expect(LanguageValidationService.computeTextSimilarity(a, b)).toBeLessThan(0.72);
    expect(LanguageValidationService.computeTextSimilarity(a, c)).toBeGreaterThanOrEqual(0.72);
  });
});
