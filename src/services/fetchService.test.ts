import { API_BASE, _delay, apiFetch } from '@/services/fetchService';

const mockDevConfigState = { DEBUG: false };

jest.mock('@/constants/devConfig', () => ({
  get DEBUG() { return mockDevConfigState.DEBUG; },
}));

describe('fetchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDevConfigState.DEBUG = false;
    global.fetch = jest.fn();
  });

  it('exporte une base API par défaut', () => {
    expect(API_BASE).toBe('https://api.cloudbreak.fr');
  });

  it('fait une requête GET avec auth et query params', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ ok: true }),
    });

    const result = await apiFetch<{ ok: boolean }>(
      '/api/v1/peaks/search',
      'token-123',
      { q: 'mont blanc' },
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.cloudbreak.fr/api/v1/peaks/search?q=mont+blanc',
      {
        method: 'GET',
        headers: { Authorization: 'Bearer token-123' },
        body: undefined,
      },
    );
    expect(result).toEqual({ ok: true });
  });

  it('ajoute Content-Type et sérialise le body JSON', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: '1' }),
    });

    await apiFetch('/api/v1/user/favorites', 'token-123', undefined, {
      method: 'POST',
      body: { peak_id: 'peak-1' },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.cloudbreak.fr/api/v1/user/favorites',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ peak_id: 'peak-1' }),
      },
    );
  });

  it('retourne undefined pour une 204', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 204,
      json: jest.fn(),
    });

    await expect(apiFetch('/api/v1/user/ping', 'token-123')).resolves.toBeUndefined();
  });

  it('relaye le detail JSON si la réponse est en erreur', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      json: jest.fn().mockResolvedValue({ detail: 'Not found' }),
    });

    await expect(apiFetch('/api/v1/missing', 'token-123')).rejects.toThrow('Not found');
  });

  it('retombe sur HTTP {status} si le corps d’erreur n’est pas parsable', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockRejectedValue(new Error('bad json')),
    });

    await expect(apiFetch('/api/v1/error', 'token-123')).rejects.toThrow('HTTP 500');
  });

  it('log la requête en mode debug', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.DEBUG = true;
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ ok: true }),
    });

    await apiFetch('/api/v1/test', 'token-123');

    expect(consoleSpy).toHaveBeenCalledWith('[fetchService] request', {
      method: 'GET',
      url: 'https://api.cloudbreak.fr/api/v1/test',
    });
    consoleSpy.mockRestore();
  });

  it('attend le délai demandé', async () => {
    jest.useFakeTimers();
    const promise = _delay(250);
    const done = jest.fn();
    promise.then(done);

    jest.advanceTimersByTime(249);
    expect(done).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    await promise;
    expect(done).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
