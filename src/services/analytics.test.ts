import { track } from '@/services/analytics';

describe('analytics', () => {
  it('track ne lève pas et log en debug', () => {
    const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    expect(() => track('onboarding_complete', { source: 'test' })).not.toThrow();
    spy.mockRestore();
  });

  it('track sans props ne lève pas', () => {
    expect(() => track('onboarding_complete')).not.toThrow();
  });
});
