import { fetchScore } from '@/services/api/score';
import { MOCK_SCORE_HIGH, MOCK_SCORE_LOW } from '@/services/mockData/score';

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

describe('api/score', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDevConfigState.MOCK_API = false;
    mockDevConfigState.DEBUG = false;
  });

  it('appelle /api/v1/score avec les paramètres attendus', async () => {
    mockApiFetch.mockResolvedValueOnce(MOCK_SCORE_HIGH);

    const result = await fetchScore('token-123', 'peak-1', '2026-03-23', 8);

    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/score', 'token-123', {
      peak_id: 'peak-1',
      date: '2026-03-23',
      hour: '8',
    });
    expect(result).toEqual(MOCK_SCORE_HIGH);
  });

  it('utilise l’heure par défaut à 6', async () => {
    mockApiFetch.mockResolvedValueOnce(MOCK_SCORE_HIGH);

    await fetchScore('token-123', 'peak-1', '2026-03-23');

    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/score', 'token-123', {
      peak_id: 'peak-1',
      date: '2026-03-23',
      hour: '6',
    });
  });

  it('retourne le score mock en mode MOCK_API', async () => {
    mockDevConfigState.MOCK_API = true;

    await expect(fetchScore('token-123', 'peak-mont-blanc', '2026-03-23')).resolves.toEqual(
      MOCK_SCORE_LOW,
    );
    expect(mockDelay).toHaveBeenCalledWith(400);
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('log le fetch mock en mode debug', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.MOCK_API = true;
    mockDevConfigState.DEBUG = true;

    await fetchScore('token-123', 'peak-1', '2026-03-23', 7);

    expect(consoleSpy).toHaveBeenCalledWith('[api/score] MOCK fetchScore', {
      peak_id: 'peak-1',
      date: '2026-03-23',
      hour: 7,
    });
    consoleSpy.mockRestore();
  });
});
