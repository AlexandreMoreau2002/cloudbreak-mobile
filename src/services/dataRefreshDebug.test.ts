import { debugDataRefresh } from '@/services/dataRefreshDebug';

const mockDevConfig = { DEBUG: true };

jest.mock('@/constants/devConfig', () => ({
  get DEBUG() { return mockDevConfig.DEBUG; },
}));

describe('debugDataRefresh', () => {
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    mockDevConfig.DEBUG = true;
    debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => { debugSpy.mockRestore(); });

  it('émet une seule ligne structurée avec propriétaire, raison et compteurs', () => {
    debugDataRefresh('week-data', 'manual', { requestCount: 63 });

    expect(debugSpy).toHaveBeenCalledTimes(1);
    expect(debugSpy).toHaveBeenCalledWith('[data-refresh]', {
      source: 'week-data', reason: 'manual', context: { requestCount: 63 },
    });
  });

  it('garde le contexte absent sans collecter les informations de session', () => {
    debugDataRefresh('display-name', 'mount-or-session');

    expect(debugSpy).toHaveBeenCalledWith('[data-refresh]', {
      source: 'display-name', reason: 'mount-or-session', context: undefined,
    });
  });

  it('trace une revalidation favorites au focus sans données de session', () => {
    debugDataRefresh('favorites', 'focus');

    expect(debugSpy).toHaveBeenCalledWith('[data-refresh]', {
      source: 'favorites', reason: 'focus', context: undefined,
    });
    expect(JSON.stringify(debugSpy.mock.calls)).not.toMatch(/mock-token|user-1/);
  });

  it('reste silencieux lorsque DEBUG est désactivé', () => {
    mockDevConfig.DEBUG = false;
    debugDataRefresh('subscription', 'foreground');

    expect(debugSpy).not.toHaveBeenCalled();
  });
});
