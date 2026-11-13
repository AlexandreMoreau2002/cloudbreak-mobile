import { postTerrainValidation } from '@/services/api/validations';

const mockDevConfigState = { MOCK_API: false, DEBUG: false };
const mockApiFetch = jest.fn();
const mockDelay = jest.fn((_ms: number) => Promise.resolve());

jest.mock('@/constants/devConfig', () => ({
  get MOCK_API() { return mockDevConfigState.MOCK_API; },
  get DEBUG() { return mockDevConfigState.DEBUG; },
}));

jest.mock('@/services/fetchService', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  _delay: (ms: number) => mockDelay(ms),
}));

describe('api/validations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDevConfigState.MOCK_API = false;
    mockDevConfigState.DEBUG = false;
  });

  it('appelle /api/v1/validations en mode API avec le payload et result converti en booléen (confirmed -> true)', async () => {
    mockApiFetch.mockResolvedValueOnce(undefined);

    await postTerrainValidation('token-123', {
      prediction_id: 'pred-1',
      result: 'confirmed',
      lat: 45.83,
      lng: 6.86,
    });

    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/validations', 'token-123', undefined, {
      method: 'POST',
      body: { prediction_id: 'pred-1', result: true, lat: 45.83, lng: 6.86 },
    });
  });

  it('convertit denied en false', async () => {
    mockApiFetch.mockResolvedValueOnce(undefined);

    await postTerrainValidation('token-123', {
      prediction_id: 'pred-2',
      result: 'denied',
    });

    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/validations', 'token-123', undefined, {
      method: 'POST',
      body: { prediction_id: 'pred-2', result: false, lat: undefined, lng: undefined },
    });
  });

  it('résout sans réseau en mode MOCK_API', async () => {
    mockDevConfigState.MOCK_API = true;

    await expect(
      postTerrainValidation('token-123', {
        prediction_id: 'pred-1',
        result: 'denied',
      }),
    ).resolves.toBeUndefined();

    expect(mockDelay).toHaveBeenCalledWith(300);
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('log postTerrainValidation en mode debug', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.MOCK_API = true;
    mockDevConfigState.DEBUG = true;
    const payload = {
      prediction_id: 'pred-1',
      result: 'confirmed' as const,
    };

    await postTerrainValidation('token-123', payload);

    expect(consoleSpy).toHaveBeenCalledWith('[api/validations] MOCK postTerrainValidation', payload);
    consoleSpy.mockRestore();
  });
});
