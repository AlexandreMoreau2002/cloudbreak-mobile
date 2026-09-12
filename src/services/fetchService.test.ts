import { API_BASE, _delay, apiFetch } from '@/services/fetchService';

const mockDevConfigState = { DEBUG: false, SIMULATE_DELAY_MS: 0 };

jest.mock('@/constants/devConfig', () => ({
  get DEBUG() { return mockDevConfigState.DEBUG; },
  get SIMULATE_DELAY_MS() { return mockDevConfigState.SIMULATE_DELAY_MS; },
}));

describe('fetchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDevConfigState.DEBUG = false;
    mockDevConfigState.SIMULATE_DELAY_MS = 0;
    global.fetch = jest.fn();
  });

  it('exporte une base API par défaut', () => {
    expect(API_BASE).toBe('https://api.cloudbreak-app.com');
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
      'https://api.cloudbreak-app.com/api/v1/peaks/search?q=mont+blanc',
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
      'https://api.cloudbreak-app.com/api/v1/user/favorites',
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
      url: 'https://api.cloudbreak-app.com/api/v1/test',
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

  it('applique SIMULATE_DELAY_MS avant de résoudre la réponse', async () => {
    jest.useFakeTimers();
    mockDevConfigState.SIMULATE_DELAY_MS = 2000;
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ ok: true }),
    });

    const promise = apiFetch<{ ok: boolean }>('/api/v1/test', 'token-123');
    const done = jest.fn();
    promise.then(done);

    await Promise.resolve();
    expect(done).not.toHaveBeenCalled();

    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ ok: true });
    expect(done).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('attache le code erreur sur l objet Error quand il est present dans la reponse', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 429,
      json: jest.fn().mockResolvedValue({ detail: 'Quota exceeded', code: 'QUOTA_EXCEEDED' }),
    });

    try {
      await apiFetch('/api/v1/score', 'token-123');
      fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe('Quota exceeded');
      expect((err as Error & { code: string }).code).toBe('QUOTA_EXCEEDED');
    }
  });

  it('attache le code erreur quand il est imbriqué dans body.detail (format FastAPI HTTPException)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 429,
      json: jest.fn().mockResolvedValue({
        detail: { detail: 'Quota journalier atteint', code: 'QUOTA_EXCEEDED' },
      }),
    });

    try {
      await apiFetch('/api/v1/score', 'token-123');
      fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe('Quota journalier atteint');
      expect((err as Error & { code: string }).code).toBe('QUOTA_EXCEEDED');
    }
  });

  it('lance NETWORK_UNREACHABLE quand fetch() rejette (backend injoignable)', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Network request failed'));

    try {
      await apiFetch('/api/v1/score', 'token-123');
      fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe('Impossible de joindre le serveur');
      expect((err as Error & { code: string }).code).toBe('NETWORK_UNREACHABLE');
    }
  });

  it('préserve AbortError pour ne pas signaler une panne réseau après annulation', async () => {
    const error = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    (global.fetch as jest.Mock).mockRejectedValue(error);
    await expect(apiFetch('/api/v1/peaks/search', null)).rejects.toBe(error);
  });

  it('interrompt une requête qui ne répond pas après le délai commun', async () => {
    jest.useFakeTimers();
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const request = apiFetch('/api/v1/slow', 'token-123');
    const expectation = expect(request).rejects.toMatchObject({ code: 'NETWORK_TIMEOUT' });
    await jest.advanceTimersByTimeAsync(10_000);
    await expectation;
    jest.useRealTimers();
  });

  it('nettoie le timeout quand la requête se termine avant le délai', async () => {
    jest.useFakeTimers();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ ok: true }),
    });

    await expect(apiFetch('/api/v1/fast', 'token-123')).resolves.toEqual({ ok: true });
    await jest.advanceTimersByTimeAsync(10_000);
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });

  it('attache httpStatus sur l erreur HTTP', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      json: jest.fn().mockResolvedValue({ detail: 'Base de données indisponible', code: 'DATABASE_UNAVAILABLE' }),
    });

    try {
      await apiFetch('/api/v1/score', 'token-123');
      fail('should have thrown');
    } catch (err) {
      expect((err as Error & { httpStatus: number }).httpStatus).toBe(503);
      expect((err as Error & { code: string }).code).toBe('DATABASE_UNAVAILABLE');
    }
  });

  it('log le réseau injoignable en mode debug', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.DEBUG = true;
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Network request failed'));

    await expect(apiFetch('/api/v1/score', 'token-123')).rejects.toThrow('Impossible de joindre le serveur');

    expect(consoleSpy).toHaveBeenCalledWith(
      '[fetchService] network unreachable',
      expect.objectContaining({ url: expect.stringContaining('/api/v1/score') }),
    );
    consoleSpy.mockRestore();
  });

  it('n’envoie pas de header Authorization quand le token est null', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ ok: true }),
    });

    await apiFetch('/api/v1/peaks/search', null, { q: 'aiguille' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.cloudbreak-app.com/api/v1/peaks/search?q=aiguille',
      {
        method: 'GET',
        headers: {},
        body: undefined,
      },
    );
  });

  it('envoie toujours le header Authorization quand un token string est fourni', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ ok: true }),
    });

    await apiFetch('/api/v1/peaks/search', 'token-abc', { q: 'aiguille' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.cloudbreak-app.com/api/v1/peaks/search?q=aiguille',
      {
        method: 'GET',
        headers: { Authorization: 'Bearer token-abc' },
        body: undefined,
      },
    );
  });

  it('passe le signal abort dans les options de fetch', async () => {
    const controller = new AbortController();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ ok: true }),
    });

    await apiFetch('/api/v1/test', 'token-123', undefined, { signal: controller.signal });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.cloudbreak-app.com/api/v1/test',
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
