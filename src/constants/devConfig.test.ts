describe('devConfig', () => {
  const previousMockApi = process.env.EXPO_PUBLIC_MOCK_API;
  const previousDev = (globalThis as { __DEV__?: boolean }).__DEV__;

  afterEach(() => {
    process.env.EXPO_PUBLIC_MOCK_API = previousMockApi;
    (globalThis as { __DEV__?: boolean }).__DEV__ = previousDev;
    jest.resetModules();
  });

  it('active MOCK_API seulement si la variable vaut true', () => {
    process.env.EXPO_PUBLIC_MOCK_API = 'true';
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;

    jest.isolateModules(() => {
      const { MOCK_API, DEBUG } = require('@/constants/devConfig');
      expect(MOCK_API).toBe(true);
      expect(DEBUG).toBe(true);
    });
  });

  it('désactive MOCK_API sinon et reflète __DEV__', () => {
    process.env.EXPO_PUBLIC_MOCK_API = 'false';
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;

    jest.isolateModules(() => {
      const { MOCK_API, DEBUG } = require('@/constants/devConfig');
      expect(MOCK_API).toBe(false);
      expect(DEBUG).toBe(false);
    });
  });
});
