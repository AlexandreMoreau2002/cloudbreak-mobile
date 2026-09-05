/**
 * useFavorites — hook CRUD pour les favoris utilisateur.
 *
 * Cache AsyncStorage TTL 3h (même pattern que useWeekData, story 7.2) :
 * un backend injoignable retombe sur le dernier snapshot connu au lieu
 * d'afficher une liste vide / une erreur bloquante.
 *
 * Usage :
 *   const { state, addFavorite, removeFavorite, fromCache, cachedAt } = useFavorites();
 */
import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { DEBUG, MOCK_API } from '@/constants/devConfig';
import type { AsyncState, Peak } from '@/services/mockData/types';
import { addFavorite as apiAddFavorite } from '@/services/api/user';
import { fetchFavorites, removeFavorite as apiRemoveFavorite } from '@/services/api/peaks';
import { useAccountGate } from '@/contexts/AccountGateContext';

const CACHE_VERSION = 'v1';
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3h

function favoritesCacheKey(userId: string): string {
  return `cache:favorites:${CACHE_VERSION}:${userId}`;
}

interface FavoritesCachePayload {
  peaks: Peak[];
  cachedAt: number;
}

export function useFavorites() {
  const { session, isAnonymous } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;
  const { requireAccount } = useAccountGate();
  const [state, setState] = useState<AsyncState<Peak[]>>({ status: 'idle' });
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const lastGoodPeaksRef = useRef<Peak[] | null>(null);

  const readCache = useCallback(async (userIdKey: string): Promise<FavoritesCachePayload | null> => {
    try {
      const raw = await AsyncStorage.getItem(favoritesCacheKey(userIdKey));
      if (!raw) return null;
      return JSON.parse(raw) as FavoritesCachePayload;
    } catch {
      return null;
    }
  }, []);

  const writeCache = useCallback(async (userIdKey: string, peaks: Peak[]) => {
    if (MOCK_API) return;
    try {
      await AsyncStorage.setItem(
        favoritesCacheKey(userIdKey),
        JSON.stringify({ peaks, cachedAt: Date.now() } satisfies FavoritesCachePayload),
      );
    } catch {
      // Cache write failure — non-fatal
    }
  }, []);

  const listFavorites = useCallback(async () => {
    if (isAnonymous || session?.user.is_anonymous) {
      setState({ status: 'success', data: [] });
      setFromCache(false);
      setCachedAt(null);
      return;
    }
    if (!token || !userId) {
      setState({ status: 'error', error: 'Non authentifié' });
      return;
    }
    if (DEBUG) console.debug('[useFavorites] listFavorites');
    setState({ status: 'loading' });

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      const cached = MOCK_API ? null : await readCache(userId);
      if (cached) {
        if (DEBUG) console.debug('[useFavorites] offline, fallback cache', { count: cached.peaks.length, age: Date.now() - cached.cachedAt });
        lastGoodPeaksRef.current = cached.peaks;
        setState({ status: 'success', data: cached.peaks });
        setFromCache(true);
        setCachedAt(cached.cachedAt);
        return;
      }
      setState({ status: 'error', error: 'OFFLINE_NO_CACHE' });
      return;
    }

    try {
      const favorites = await fetchFavorites(token);
      const peaks = favorites.map((f) => f.peak);
      if (DEBUG) console.debug('[useFavorites] listFavorites success', { count: peaks.length });
      lastGoodPeaksRef.current = peaks;
      setState({ status: 'success', data: peaks });
      setFromCache(false);
      setCachedAt(null);
      await writeCache(userId, peaks);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      if (DEBUG) console.debug('[useFavorites] listFavorites error', { message });

      const cached = MOCK_API ? null : await readCache(userId);
      const cacheValid = cached != null && Date.now() - cached.cachedAt < CACHE_TTL_MS;
      if (cacheValid) {
        if (DEBUG) console.debug('[useFavorites] fetch failed, fallback cache', { count: cached.peaks.length, age: Date.now() - cached.cachedAt });
        lastGoodPeaksRef.current = cached.peaks;
        setState({ status: 'success', data: cached.peaks });
        setFromCache(true);
        setCachedAt(cached.cachedAt);
        return;
      }

      setState({ status: 'error', error: message });
    }
  }, [isAnonymous, session?.user.is_anonymous, token, userId, readCache, writeCache]);

  useEffect(() => {
    listFavorites();
  }, [listFavorites]);

  const addFavorite = useCallback(async (peakId: string) => {
    if (!token) return;
    if (isAnonymous || session?.user.is_anonymous) {
      requireAccount({ kind: 'favorite', peakId });
      return;
    }
    if (DEBUG) console.debug('[useFavorites] addFavorite', { peakId });
    try {
      await apiAddFavorite(token, peakId);
      await listFavorites();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      if (DEBUG) console.debug('[useFavorites] addFavorite error', { message });
    }
  }, [token, isAnonymous, session?.user.is_anonymous, requireAccount, listFavorites]);

  const removeFavorite = useCallback(async (peakId: string) => {
    if (!token) return;
    if (isAnonymous || session?.user.is_anonymous) return;
    if (DEBUG) console.debug('[useFavorites] removeFavorite', { peakId });
    try {
      await apiRemoveFavorite(token, peakId);
      await listFavorites();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      if (DEBUG) console.debug('[useFavorites] removeFavorite error', { message });
    }
  }, [token, isAnonymous, session?.user.is_anonymous, listFavorites]);

  return { state, addFavorite, removeFavorite, refresh: listFavorites, fromCache, cachedAt };
}
