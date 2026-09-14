describe('devConfig', () => {
  const previousMockApi = process.env.EXPO_PUBLIC_MOCK_API;
  const previousDebug = process.env.EXPO_PUBLIC_DEBUG;
  const previousDevTools = process.env.EXPO_PUBLIC_DEV_TOOLS;
  const previousDev = (globalThis as { __DEV__?: boolean }).__DEV__;

  afterEach(() => {
    process.env.EXPO_PUBLIC_MOCK_API = previousMockApi;
    process.env.EXPO_PUBLIC_DEBUG = previousDebug;
    process.env.EXPO_PUBLIC_DEV_TOOLS = previousDevTools;
    (globalThis as { __DEV__?: boolean }).__DEV__ = previousDev;
    jest.resetModules();
  });

  it('active MOCK_API seulement si la variable vaut true', () => {
    process.env.EXPO_PUBLIC_MOCK_API = 'true';

    jest.isolateModules(() => {
      const { MOCK_API } = require('@/constants/devConfig');
      expect(MOCK_API).toBe(true);
    });
  });

  it('désactive MOCK_API sinon', () => {
    process.env.EXPO_PUBLIC_MOCK_API = 'false';

    jest.isolateModules(() => {
      const { MOCK_API } = require('@/constants/devConfig');
      expect(MOCK_API).toBe(false);
    });
  });

  it('active DEBUG seulement si __DEV__ ET EXPO_PUBLIC_DEBUG valent true', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    process.env.EXPO_PUBLIC_DEBUG = 'true';

    jest.isolateModules(() => {
      const { DEBUG } = require('@/constants/devConfig');
      expect(DEBUG).toBe(true);
    });
  });

  it('désactive DEBUG si EXPO_PUBLIC_DEBUG est absent, même en __DEV__', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    process.env.EXPO_PUBLIC_DEBUG = undefined;

    jest.isolateModules(() => {
      const { DEBUG } = require('@/constants/devConfig');
      expect(DEBUG).toBe(false);
    });
  });

  it('désactive DEBUG hors __DEV__ même si EXPO_PUBLIC_DEBUG vaut true', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    process.env.EXPO_PUBLIC_DEBUG = 'true';

    jest.isolateModules(() => {
      const { DEBUG } = require('@/constants/devConfig');
      expect(DEBUG).toBe(false);
    });
  });

  it('active DEV_TOOLS_ENABLED seulement si __DEV__ ET EXPO_PUBLIC_DEV_TOOLS valent true', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    process.env.EXPO_PUBLIC_DEV_TOOLS = 'true';

    jest.isolateModules(() => {
      const { DEV_TOOLS_ENABLED } = require('@/constants/devConfig');
      expect(DEV_TOOLS_ENABLED).toBe(true);
    });
  });

  it('désactive DEV_TOOLS_ENABLED si EXPO_PUBLIC_DEV_TOOLS est absent, même en __DEV__', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    process.env.EXPO_PUBLIC_DEV_TOOLS = undefined;

    jest.isolateModules(() => {
      const { DEV_TOOLS_ENABLED } = require('@/constants/devConfig');
      expect(DEV_TOOLS_ENABLED).toBe(false);
    });
  });

  it('désactive DEV_TOOLS_ENABLED hors __DEV__ même si EXPO_PUBLIC_DEV_TOOLS vaut true', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    process.env.EXPO_PUBLIC_DEV_TOOLS = 'true';

    jest.isolateModules(() => {
      const { DEV_TOOLS_ENABLED } = require('@/constants/devConfig');
      expect(DEV_TOOLS_ENABLED).toBe(false);
    });
  });
});
