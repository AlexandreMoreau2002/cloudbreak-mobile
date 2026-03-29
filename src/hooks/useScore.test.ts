import { useScore } from '@/hooks/useScore';
import { renderHook, waitFor } from '@testing-library/react-native';

const mockFetchScore = jest.fn();

jest.mock('@/services/api/score', () => ({
  fetchScore: (...args: unknown[]) => mockFetchScore(...args),
}));

// Mutable config state — values are read at runtime via getters so tests can override them
const mockDevConfigState = { MOCK_API: false, DEBUG: false };
jest.mock('@/constants/devConfig', () => ({
  get MOCK_API() { return mockDevConfigState.MOCK_API; },
  get DEBUG() { return mockDevConfigState.DEBUG; },
}));

// Stateful AsyncStorage mock so setItem/getItem interact correctly.
const asyncStorageStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(asyncStorageStore[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    asyncStorageStore[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete asyncStorageStore[key];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(asyncStorageStore).forEach((k) => delete asyncStorageStore[k]);
    return Promise.resolve();
  }),
}));

const MOCK_SCORE_RESPONSE = {
  score: 84,
  verdict: 'high' as const,
  cloud_base: 1200,
  peak_name: 'Mont Blanc',
  peak_altitude: 4808,
  conditions: {
    cloud_base_score: 0.9,
    humidity_score: 0.8,
    wind_score: 0.7,
    inversion_score: 0.6,
  },
};

function makeCacheableScore() {
  return {
    ...MOCK_SCORE_RESPONSE,
    label_code: 'score.label.high',
    context_code: 'score.context.high.stable_window',
  };
}

describe('useScore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset config to defaults
    mockDevConfigState.MOCK_API = false;
    mockDevConfigState.DEBUG = false;
    // Purge the in-memory store between tests
    Object.keys(asyncStorageStore).forEach((k) => delete asyncStorageStore[k]);
  });

  it('retourne_idle_sans_peak_id', () => {
    const { result } = renderHook(() => useScore(null, '2026-03-23', 6, 'mock-token'));
    expect(result.current.status).toBe('idle');
  });

  it('retourne_idle_sans_token', () => {
    const { result } = renderHook(() => useScore('peak-1', '2026-03-23', 6, null));
    expect(result.current.status).toBe('idle');
  });

  it('retourne_loading_puis_success', async () => {
    mockFetchScore.mockResolvedValue(MOCK_SCORE_RESPONSE);
    const { result } = renderHook(() => useScore('peak-1', '2026-03-23', 6, 'mock-token'));

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.data).toEqual(MOCK_SCORE_RESPONSE);
    expect(mockFetchScore).toHaveBeenCalledWith('mock-token', 'peak-1', '2026-03-23', 6);
  });

  it('retourne_error_si_api_echoue', async () => {
    mockFetchScore.mockRejectedValue(new Error('Erreur réseau'));
    const { result } = renderHook(() => useScore('peak-1', '2026-03-23', 6, 'mock-token'));

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.error).toBe('Erreur de chargement');
  });

  it('message_service_indisponible', async () => {
    mockFetchScore.mockRejectedValue(new Error('HTTP 503 Service Unavailable'));
    const { result } = renderHook(() => useScore('peak-1', '2026-03-23', 6, 'mock-token'));

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.error).toContain('Service momentanément indisponible');
  });

  it('retourne_cache_si_valide', async () => {
    const cachedScore = makeCacheableScore();
    const entry = { data: cachedScore, cachedAt: Date.now() };
    asyncStorageStore['cache:score:v2:peak-1:2026-03-23:6'] = JSON.stringify(entry);

    const { result } = renderHook(() => useScore('peak-1', '2026-03-23', 6, 'mock-token'));

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.data).toEqual(cachedScore);
    expect(mockFetchScore).not.toHaveBeenCalled();
  });

  it('appelle_api_si_cache_expire', async () => {
    const expiredCachedAt = Date.now() - 3 * 60 * 60 * 1000; // 3h ago
    const entry = { data: makeCacheableScore(), cachedAt: expiredCachedAt };
    asyncStorageStore['cache:score:v2:peak-1:2026-03-23:6'] = JSON.stringify(entry);
    mockFetchScore.mockResolvedValue(MOCK_SCORE_RESPONSE);

    const { result } = renderHook(() => useScore('peak-1', '2026-03-23', 6, 'mock-token'));

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(mockFetchScore).toHaveBeenCalledWith('mock-token', 'peak-1', '2026-03-23', 6);
  });

  it('appelle_api_si_cache_absent', async () => {
    mockFetchScore.mockResolvedValue(MOCK_SCORE_RESPONSE);

    const { result } = renderHook(() => useScore('peak-1', '2026-03-23', 6, 'mock-token'));

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(mockFetchScore).toHaveBeenCalledWith('mock-token', 'peak-1', '2026-03-23', 6);
  });

  it('retourne_erreur_inconnue_si_err_non_Error', async () => {
    // Throw a non-Error value (string) to cover the `err instanceof Error` false branch
    mockFetchScore.mockRejectedValue('string error, not an Error object');

    const { result } = renderHook(() => useScore('peak-1', '2026-03-23', 6, 'mock-token'));

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.error).toBe('Erreur de chargement');
  });

  it('continue_si_lecture_cache_echoue', async () => {
    // Simulate AsyncStorage.getItem throwing — non-fatal, should fall through to API
    const AsyncStorage = jest.requireMock('@react-native-async-storage/async-storage');
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage read error'));
    mockFetchScore.mockResolvedValue(MOCK_SCORE_RESPONSE);

    const { result } = renderHook(() => useScore('peak-1', '2026-03-23', 6, 'mock-token'));

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(mockFetchScore).toHaveBeenCalledWith('mock-token', 'peak-1', '2026-03-23', 6);
  });

  it('continue_si_ecriture_cache_echoue', async () => {
    // Simulate AsyncStorage.setItem throwing after API success — non-fatal
    const AsyncStorage = jest.requireMock('@react-native-async-storage/async-storage');
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage write error'));
    mockFetchScore.mockResolvedValue(MOCK_SCORE_RESPONSE);

    const { result } = renderHook(() => useScore('peak-1', '2026-03-23', 6, 'mock-token'));

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.data).toEqual(MOCK_SCORE_RESPONSE);
  });

  // Cover MOCK_API=true branch — cache is skipped
  it('skip_cache_quand_mock_api_true', async () => {
    mockDevConfigState.MOCK_API = true;
    mockFetchScore.mockResolvedValue(MOCK_SCORE_RESPONSE);

    const { result } = renderHook(() => useScore('peak-1', '2026-03-23', 6, 'mock-token'));

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.data).toEqual(MOCK_SCORE_RESPONSE);
    expect(mockFetchScore).toHaveBeenCalledWith('mock-token', 'peak-1', '2026-03-23', 6);
    // AsyncStorage.getItem should NOT have been called when MOCK_API=true
    const AsyncStorage = jest.requireMock('@react-native-async-storage/async-storage');
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  });

  // Cover DEBUG=true branches
  it('emet_log_debug_pour_etat_idle', () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.DEBUG = true;

    renderHook(() => useScore(null, '2026-03-23', 6, 'mock-token'));

    expect(consoleSpy).toHaveBeenCalledWith(
      '[useScore] idle — token or peakId missing',
      expect.any(Object),
    );
    consoleSpy.mockRestore();
  });

  it('emet_logs_debug_en_mode_debug_pour_cycle_success', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.DEBUG = true;
    mockFetchScore.mockResolvedValue(MOCK_SCORE_RESPONSE);

    const { result } = renderHook(() => useScore('peak-1', '2026-03-23', 6, 'mock-token'));

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('emet_log_debug_pour_cache_hit', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.DEBUG = true;
    const entry = { data: makeCacheableScore(), cachedAt: Date.now() };
    asyncStorageStore['cache:score:v2:peak-1:2026-03-23:6'] = JSON.stringify(entry);

    const { result } = renderHook(() => useScore('peak-1', '2026-03-23', 6, 'mock-token'));

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(consoleSpy).toHaveBeenCalledWith('[useScore] cache hit', expect.any(Object));
    consoleSpy.mockRestore();
  });

  it('emet_log_debug_pour_cache_miss_expire', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.DEBUG = true;
    const expiredEntry = { data: makeCacheableScore(), cachedAt: Date.now() - 3 * 60 * 60 * 1000 };
    asyncStorageStore['cache:score:v2:peak-1:2026-03-23:6'] = JSON.stringify(expiredEntry);
    mockFetchScore.mockResolvedValue(MOCK_SCORE_RESPONSE);

    const { result } = renderHook(() => useScore('peak-1', '2026-03-23', 6, 'mock-token'));

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(consoleSpy).toHaveBeenCalledWith('[useScore] cache miss/expired', expect.any(Object));
    consoleSpy.mockRestore();
  });

  it('emet_log_debug_pour_erreur_api', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.DEBUG = true;
    mockFetchScore.mockRejectedValue(new Error('Erreur réseau'));

    const { result } = renderHook(() => useScore('peak-1', '2026-03-23', 6, 'mock-token'));

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(consoleSpy).toHaveBeenCalledWith('[useScore] error', expect.any(Object));
    consoleSpy.mockRestore();
  });

  it('ignore_un_cache_legacy_sans_codes_i18n', async () => {
    const legacyEntry = { data: MOCK_SCORE_RESPONSE, cachedAt: Date.now() };
    asyncStorageStore['cache:score:v2:peak-1:2026-03-23:6'] = JSON.stringify(legacyEntry);
    mockFetchScore.mockResolvedValue(MOCK_SCORE_RESPONSE);

    const { result } = renderHook(() => useScore('peak-1', '2026-03-23', 6, 'mock-token'));

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(mockFetchScore).toHaveBeenCalledWith('mock-token', 'peak-1', '2026-03-23', 6);
  });

  it('ignore_un_cache_contradictoire_avec_le_verdict', async () => {
    const inconsistentEntry = {
      data: {
        ...makeCacheableScore(),
        context_code: 'score.context.low.no_inversion',
      },
      cachedAt: Date.now(),
    };
    asyncStorageStore['cache:score:v2:peak-1:2026-03-23:6'] = JSON.stringify(inconsistentEntry);
    mockFetchScore.mockResolvedValue(MOCK_SCORE_RESPONSE);

    const { result } = renderHook(() => useScore('peak-1', '2026-03-23', 6, 'mock-token'));

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(mockFetchScore).toHaveBeenCalledWith('mock-token', 'peak-1', '2026-03-23', 6);
  });

  it('ignore_un_cache_sans_context_code', async () => {
    const entry = {
      data: {
        ...makeCacheableScore(),
        context_code: undefined,
      },
      cachedAt: Date.now(),
    };
    asyncStorageStore['cache:score:v2:peak-1:2026-03-23:6'] = JSON.stringify(entry);
    mockFetchScore.mockResolvedValue(MOCK_SCORE_RESPONSE);

    const { result } = renderHook(() => useScore('peak-1', '2026-03-23', 6, 'mock-token'));

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(mockFetchScore).toHaveBeenCalledWith('mock-token', 'peak-1', '2026-03-23', 6);
  });

  it('accepte_un_cache_compatible_pour_le_verdict_none', async () => {
    const cachedScore = {
      ...MOCK_SCORE_RESPONSE,
      verdict: 'none' as const,
      score: 0,
      label_code: 'score.label.none',
      context_code: 'score.context.none.clear_window',
    };
    const entry = { data: cachedScore, cachedAt: Date.now() };
    asyncStorageStore['cache:score:v2:peak-1:2026-03-23:6'] = JSON.stringify(entry);

    const { result } = renderHook(() => useScore('peak-1', '2026-03-23', 6, 'mock-token'));

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.data).toEqual(cachedScore);
    expect(mockFetchScore).not.toHaveBeenCalled();
  });

  it.each([
    {
      verdict: 'medium' as const,
      score: 52,
      label_code: 'score.label.medium',
      context_code: 'score.context.medium.neutral_window',
    },
    {
      verdict: 'low' as const,
      score: 18,
      label_code: 'score.label.low',
      context_code: 'score.context.low.narrow_window',
    },
  ])('accepte_un_cache_compatible_pour_le_verdict_$verdict', async ({ verdict, score, label_code, context_code }) => {
    const cachedScore = {
      ...MOCK_SCORE_RESPONSE,
      verdict,
      score,
      label_code,
      context_code,
    };
    const entry = { data: cachedScore, cachedAt: Date.now() };
    asyncStorageStore['cache:score:v2:peak-1:2026-03-23:6'] = JSON.stringify(entry);

    const { result } = renderHook(() => useScore('peak-1', '2026-03-23', 6, 'mock-token'));

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.data).toEqual(cachedScore);
    expect(mockFetchScore).not.toHaveBeenCalled();
  });
});
