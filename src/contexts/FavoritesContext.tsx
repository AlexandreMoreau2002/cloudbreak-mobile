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

interface FavoritesSnapshot {
  accountKey: string;
  state: AsyncState<Peak[]>;
  fromCache: boolean;
  cachedAt: number | null;
}

type FavoriteMutation =
  | { revision: number; kind: 'add'; peak: Peak }
  | { revision: number; kind: 'remove'; peakId: string };

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
  const [snapshot, setSnapshot] = useState<FavoritesSnapshot>({
    accountKey, state: { status: 'idle' }, fromCache: false, cachedAt: null,
  });
  const lastFetchedAtRef = useRef<number | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const lastGoodPeaksRef = useRef<Peak[] | null>(null);
  const accountKeyRef = useRef(accountKey);
  const mutationRevisionRef = useRef(0);
  const mutationJournalRef = useRef<FavoriteMutation[]>([]);
  const cacheWriteRef = useRef<Promise<void>>(Promise.resolve());
  const lastGoodCachedAtRef = useRef<number | null>(null);

  const publish = useCallback((nextState: AsyncState<Peak[]>, nextFromCache = false, nextCachedAt: number | null = null) => {
    setSnapshot({ accountKey, state: nextState, fromCache: nextFromCache, cachedAt: nextCachedAt });
  }, [accountKey]);

  useEffect(() => {
    accountKeyRef.current = accountKey;
    lastFetchedAtRef.current = null;
    inFlightRef.current = null;
    lastGoodPeaksRef.current = null;
    lastGoodCachedAtRef.current = null;
    mutationRevisionRef.current = 0;
    mutationJournalRef.current = [];
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
    const payload = JSON.stringify({ peaks, cachedAt: Date.now() } satisfies FavoritesCachePayload);
    const write = cacheWriteRef.current.then(() => AsyncStorage.setItem(favoritesCacheKey(cacheUserId), payload));
    cacheWriteRef.current = write.catch(() => undefined);
    await cacheWriteRef.current;
  }, []);

  const load = useCallback(({ force, reason }: { force: boolean; reason: DataRefreshReason }): Promise<void> => {
    if (inFlightRef.current) return inFlightRef.current;
    if (!force && lastFetchedAtRef.current !== null
      && Date.now() - lastFetchedAtRef.current < FAVORITES_FRESHNESS_MS) return Promise.resolve();

    const requestAccountKey = accountKey;
    const requestRevision = mutationRevisionRef.current;
    mutationJournalRef.current = [];
    const request = (async () => {
      if (anonymous) {
        lastGoodPeaksRef.current = [];
        publish({ status: 'success', data: [] });
        return;
      }
      if (!token || !userId) {
        publish({ status: 'error', error: 'Non authentifié' });
        return;
      }

      if (DEBUG) console.debug('[useFavorites] listFavorites');
      if (lastGoodPeaksRef.current === null) publish({ status: 'loading' });
      const cached = MOCK_API || lastGoodPeaksRef.current !== null ? null : await readCache(userId);
      if (accountKeyRef.current !== requestAccountKey) return;
      const cacheValid = cached !== null && Date.now() - cached.cachedAt < CACHE_TTL_MS;
      const hydrateCache = cacheValid && lastGoodPeaksRef.current === null;
      if (hydrateCache) {
        lastGoodPeaksRef.current = cached.peaks;
        lastGoodCachedAtRef.current = cached.cachedAt;
        publish({ status: 'success', data: cached.peaks }, true, cached.cachedAt);
      }

      try {
        const netState = await NetInfo.fetch();
        if (accountKeyRef.current !== requestAccountKey) return;
        if (!netState.isConnected) {
          if (hydrateCache) {
            if (DEBUG) console.debug('[useFavorites] offline, fallback cache', {
              count: cached.peaks.length, age: Date.now() - cached.cachedAt,
            });
          } else if (lastGoodPeaksRef.current !== null) {
            publish(
              { status: 'success', data: lastGoodPeaksRef.current },
              lastGoodCachedAtRef.current !== null,
              lastGoodCachedAtRef.current,
            );
          } else {
            publish({ status: 'error', error: 'OFFLINE_NO_CACHE' });
          }
          return;
        }

        debugDataRefresh('favorites', reason);
        const favorites = await fetchFavorites(token);
        if (accountKeyRef.current !== requestAccountKey) return;
        const serverPeaks = favorites.map((favorite) => favorite.peak);
        const peaks = mutationJournalRef.current
          .filter((mutation) => mutation.revision > requestRevision)
          .reduce((current, mutation) => {
            if (mutation.kind === 'remove') return current.filter((peak) => peak.id !== mutation.peakId);
            return current.some((peak) => peak.id === mutation.peak.id)
              ? current : [...current, mutation.peak];
          }, serverPeaks);
        if (DEBUG) console.debug('[useFavorites] listFavorites success', { count: peaks.length });
        lastGoodPeaksRef.current = peaks;
        lastGoodCachedAtRef.current = null;
        lastFetchedAtRef.current = Date.now();
        publish({ status: 'success', data: peaks });
        await writeCache(userId, peaks);
      } catch (error) {
        if (accountKeyRef.current !== requestAccountKey) return;
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        if (DEBUG) console.debug('[useFavorites] listFavorites error', { message });
        if (lastGoodPeaksRef.current !== null) {
          if (hydrateCache && DEBUG) console.debug('[useFavorites] fetch failed, fallback cache', {
            count: cached.peaks.length, age: Date.now() - cached.cachedAt,
          });
          publish(
            { status: 'success', data: lastGoodPeaksRef.current },
            lastGoodCachedAtRef.current !== null,
            lastGoodCachedAtRef.current,
          );
        } else {
          publish({ status: 'error', error: message });
        }
      }
    })();

    inFlightRef.current = request;
    void request.finally(() => {
      if (inFlightRef.current === request) {
        inFlightRef.current = null;
        mutationJournalRef.current = [];
      }
    });
    return request;
  }, [accountKey, anonymous, token, userId, publish, readCache, writeCache]);

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
      const revision = ++mutationRevisionRef.current;
      if (inFlightRef.current) mutationJournalRef.current.push({ revision, kind: 'add', peak: favorite.peak });
      lastGoodPeaksRef.current = afterAdd;
      lastGoodCachedAtRef.current = null;
      lastFetchedAtRef.current = Date.now();
      publish({ status: 'success', data: afterAdd });
      await writeCache(userId, afterAdd);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      if (DEBUG) console.debug('[useFavorites] addFavorite error', { message });
    }
  }, [accountKey, anonymous, requireAccount, token, userId, publish, writeCache]);

  const removeFavorite = useCallback(async (peakId: string): Promise<void> => {
    if (!token || anonymous) return;
    if (DEBUG) console.debug('[useFavorites] removeFavorite', { peakId });
    try {
      await apiRemoveFavorite(token, peakId);
      if (accountKeyRef.current !== accountKey || !userId) return;
      const current = lastGoodPeaksRef.current ?? [];
      const afterRemove = current.filter((peak) => peak.id !== peakId);
      const revision = ++mutationRevisionRef.current;
      if (inFlightRef.current) mutationJournalRef.current.push({ revision, kind: 'remove', peakId });
      lastGoodPeaksRef.current = afterRemove;
      lastGoodCachedAtRef.current = null;
      lastFetchedAtRef.current = Date.now();
      publish({ status: 'success', data: afterRemove });
      await writeCache(userId, afterRemove);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      if (DEBUG) console.debug('[useFavorites] removeFavorite error', { message });
    }
  }, [accountKey, anonymous, token, userId, publish, writeCache]);

  const refresh = useCallback(() => load({ force: true, reason: 'manual' }), [load]);
  const revalidate = useCallback(() => load({ force: false, reason: 'focus' }), [load]);
  const visible = snapshot.accountKey === accountKey ? snapshot : {
    accountKey, state: { status: 'loading' } as AsyncState<Peak[]>, fromCache: false, cachedAt: null,
  };

  return <FavoritesContext.Provider value={{
    state: visible.state, fromCache: visible.fromCache, cachedAt: visible.cachedAt,
    addFavorite, removeFavorite, refresh, revalidate,
  }}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error('useFavorites must be used within FavoritesProvider');
  return value;
}
