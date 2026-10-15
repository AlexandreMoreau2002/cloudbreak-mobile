/** Shared favorites list with a short network freshness window and an offline snapshot. */
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { DEBUG, MOCK_API } from '@/constants/devConfig';
import { useAccountGate } from '@/contexts/AccountGateContext';
import type { AsyncState, Peak } from '@/services/mockData/types';
import { addFavorite as apiAddFavorite } from '@/services/api/user';
import { debugDataRefresh, type DataRefreshReason } from '@/services/dataRefreshDebug';
import { fetchFavorites, removeFavorite as apiRemoveFavorite } from '@/services/api/peaks';

const CACHE_VERSION = 'v1';
const CACHE_TTL_MS = 3 * 60 * 60 * 1000;
const FAVORITES_FRESHNESS_MS = 60 * 1000;

interface FavoritesCachePayload {
  peaks: Peak[];
  cachedAt: number;
}

export interface FavoritesContextValue {
  state: AsyncState<Peak[]>;
  fromCache: boolean;
  cachedAt: number | null;
  addFavorite: (peakId: string) => Promise<void>;
  removeFavorite: (peakId: string) => Promise<void>;
  refresh: () => Promise<void>;
  revalidate: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function favoritesCacheKey(userId: string): string {
  return `cache:favorites:${CACHE_VERSION}:${userId}`;
}

export function FavoritesProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { session, isAnonymous } = useAuth();
  const { requireAccount } = useAccountGate();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;
  const anonymous = isAnonymous || Boolean(session?.user.is_anonymous);
  const accountKey = `${userId ?? ''}:${token ?? ''}:${anonymous}`;
  const [state, setState] = useState<AsyncState<Peak[]>>({ status: 'idle' });
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const lastFetchedAtRef = useRef<number | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const lastGoodPeaksRef = useRef<Peak[] | null>(null);
  const accountKeyRef = useRef(accountKey);

  useEffect(() => {
    accountKeyRef.current = accountKey;
    lastFetchedAtRef.current = null;
    inFlightRef.current = null;
    lastGoodPeaksRef.current = null;
  }, [accountKey]);

  const readCache = useCallback(async (cacheUserId: string): Promise<FavoritesCachePayload | null> => {
    try {
      const raw = await AsyncStorage.getItem(favoritesCacheKey(cacheUserId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as FavoritesCachePayload;
      return Array.isArray(parsed.peaks) && Number.isFinite(parsed.cachedAt) ? parsed : null;
    } catch {
      return null;
    }
  }, []);

  const writeCache = useCallback(async (cacheUserId: string, peaks: Peak[]): Promise<void> => {
    if (MOCK_API) return;
    try {
      await AsyncStorage.setItem(
        favoritesCacheKey(cacheUserId),
        JSON.stringify({ peaks, cachedAt: Date.now() } satisfies FavoritesCachePayload),
      );
    } catch {
      // The network result remains usable when the local cache cannot be written.
    }
  }, []);

  const load = useCallback(({ force, reason }: { force: boolean; reason: DataRefreshReason }): Promise<void> => {
    if (inFlightRef.current) return inFlightRef.current;
    if (!force && lastFetchedAtRef.current !== null
      && Date.now() - lastFetchedAtRef.current < FAVORITES_FRESHNESS_MS) return Promise.resolve();

    const requestAccountKey = accountKey;
    const request = (async () => {
      if (anonymous) {
        lastGoodPeaksRef.current = [];
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
      if (lastGoodPeaksRef.current === null) setState({ status: 'loading' });
      const cached = MOCK_API ? null : await readCache(userId);
      if (accountKeyRef.current !== requestAccountKey) return;
      const cacheValid = cached !== null && Date.now() - cached.cachedAt < CACHE_TTL_MS;
      if (cacheValid) {
        lastGoodPeaksRef.current = cached.peaks;
        setState({ status: 'success', data: cached.peaks });
        setFromCache(true);
        setCachedAt(cached.cachedAt);
      }

      try {
        const netState = await NetInfo.fetch();
        if (accountKeyRef.current !== requestAccountKey) return;
        if (!netState.isConnected) {
          if (cacheValid) {
            if (DEBUG) console.debug('[useFavorites] offline, fallback cache', {
              count: cached.peaks.length, age: Date.now() - cached.cachedAt,
            });
          } else if (lastGoodPeaksRef.current !== null) {
            setState({ status: 'success', data: lastGoodPeaksRef.current });
          } else {
            setState({ status: 'error', error: 'OFFLINE_NO_CACHE' });
          }
          return;
        }

        debugDataRefresh('favorites', reason);
        const favorites = await fetchFavorites(token);
        if (accountKeyRef.current !== requestAccountKey) return;
        const peaks = favorites.map((favorite) => favorite.peak);
        if (DEBUG) console.debug('[useFavorites] listFavorites success', { count: peaks.length });
        lastGoodPeaksRef.current = peaks;
        lastFetchedAtRef.current = Date.now();
        setState({ status: 'success', data: peaks });
        setFromCache(false);
        setCachedAt(null);
        await writeCache(userId, peaks);
      } catch (error) {
        if (accountKeyRef.current !== requestAccountKey) return;
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        if (DEBUG) console.debug('[useFavorites] listFavorites error', { message });
        if (cacheValid) {
          if (DEBUG) console.debug('[useFavorites] fetch failed, fallback cache', {
            count: cached.peaks.length, age: Date.now() - cached.cachedAt,
          });
          lastGoodPeaksRef.current = cached.peaks;
          setState({ status: 'success', data: cached.peaks });
          setFromCache(true);
          setCachedAt(cached.cachedAt);
        } else if (lastGoodPeaksRef.current !== null) {
          setState({ status: 'success', data: lastGoodPeaksRef.current });
        } else {
          setState({ status: 'error', error: message });
        }
      }
    })();

    inFlightRef.current = request;
    void request.finally(() => {
      if (inFlightRef.current === request) inFlightRef.current = null;
    });
    return request;
  }, [accountKey, anonymous, token, userId, readCache, writeCache]);

  useEffect(() => {
    void load({ force: true, reason: 'mount-or-session' });
  }, [load]);

  const addFavorite = useCallback(async (peakId: string): Promise<void> => {
    if (!token) return;
    if (anonymous) {
      requireAccount({ kind: 'favorite', peakId });
      return;
    }
    if (DEBUG) console.debug('[useFavorites] addFavorite', { peakId });
    try {
      const favorite = await apiAddFavorite(token, peakId);
      if (accountKeyRef.current !== accountKey || !userId) return;
      const current = lastGoodPeaksRef.current ?? [];
      const afterAdd = current.some((peak) => peak.id === favorite.peak.id)
        ? current : [...current, favorite.peak];
      lastGoodPeaksRef.current = afterAdd;
      lastFetchedAtRef.current = Date.now();
      setState({ status: 'success', data: afterAdd });
      setFromCache(false);
      setCachedAt(null);
      await writeCache(userId, afterAdd);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      if (DEBUG) console.debug('[useFavorites] addFavorite error', { message });
    }
  }, [accountKey, anonymous, requireAccount, token, userId, writeCache]);

  const removeFavorite = useCallback(async (peakId: string): Promise<void> => {
    if (!token || anonymous) return;
    if (DEBUG) console.debug('[useFavorites] removeFavorite', { peakId });
    try {
      await apiRemoveFavorite(token, peakId);
      if (accountKeyRef.current !== accountKey || !userId) return;
      const current = lastGoodPeaksRef.current ?? [];
      const afterRemove = current.filter((peak) => peak.id !== peakId);
      lastGoodPeaksRef.current = afterRemove;
      lastFetchedAtRef.current = Date.now();
      setState({ status: 'success', data: afterRemove });
      setFromCache(false);
      setCachedAt(null);
      await writeCache(userId, afterRemove);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      if (DEBUG) console.debug('[useFavorites] removeFavorite error', { message });
    }
  }, [accountKey, anonymous, token, userId, writeCache]);

  const refresh = useCallback(() => load({ force: true, reason: 'manual' }), [load]);
  const revalidate = useCallback(() => load({ force: false, reason: 'focus' }), [load]);

  return <FavoritesContext.Provider value={{
    state, fromCache, cachedAt, addFavorite, removeFavorite, refresh, revalidate,
  }}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error('useFavorites must be used within FavoritesProvider');
  return value;
}
