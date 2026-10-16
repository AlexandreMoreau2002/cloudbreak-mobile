/** Favorites data layer: network freshness window, offline snapshot and mutation journal. */
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

type FavoriteMutationInput =
  | { kind: 'add'; peak: Peak }
  | { kind: 'remove'; peakId: string };
type FavoriteMutation = FavoriteMutationInput & { revision: number };

export interface FavoritesContextValue {
  state: AsyncState<Peak[]>;
  fromCache: boolean;
  cachedAt: number | null;
  addFavorite: (peakId: string) => Promise<void>;
  removeFavorite: (peakId: string) => Promise<void>;
  refresh: () => Promise<void>;
  revalidate: () => Promise<void>;
}

function favoritesCacheKey(userId: string): string {
  return `cache:favorites:${CACHE_VERSION}:${userId}`;
}

export function useFavoritesData(): FavoritesContextValue {
  const { session, isAnonymous } = useAuth();
  const { requireAccount } = useAccountGate();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;
  const anonymous = isAnonymous || Boolean(session?.user.is_anonymous);
  const accountKey = `${userId ?? ''}:${anonymous}`;
  const tokenRef = useRef(token);
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
    tokenRef.current = token;
  }, [token]);

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

  const publishLastGood = useCallback((): boolean => {
    if (lastGoodPeaksRef.current === null) return false;
    publish(
      { status: 'success', data: lastGoodPeaksRef.current },
      lastGoodCachedAtRef.current !== null,
      lastGoodCachedAtRef.current,
    );
    return true;
  }, [publish]);

  const load = useCallback(({ force, reason }: { force: boolean; reason: DataRefreshReason }): Promise<void> => {
    if (inFlightRef.current) return inFlightRef.current;
    if (!force && lastFetchedAtRef.current !== null
      && Date.now() - lastFetchedAtRef.current < FAVORITES_FRESHNESS_MS) return Promise.resolve();

    const requestAccountKey = accountKey;
    const requestRevision = mutationRevisionRef.current;
    mutationJournalRef.current = [];
    const request = (async () => {
      const token = tokenRef.current;
      let hydratedFromCache = false;
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

      try {
        const netState = await NetInfo.fetch();
        if (accountKeyRef.current !== requestAccountKey) return;
        const offline = !netState.isConnected;

        if (lastGoodPeaksRef.current === null) {
          const cached = MOCK_API ? null : await readCache(userId);
          if (accountKeyRef.current !== requestAccountKey) return;
          // Hors ligne, le snapshot sert quel que soit son âge ; en ligne, seulement s'il est récent.
          if (cached !== null && lastGoodPeaksRef.current === null
            && (offline || Date.now() - cached.cachedAt < CACHE_TTL_MS)) {
            if (DEBUG && offline) console.debug('[useFavorites] offline, fallback cache', {
              count: cached.peaks.length, age: Date.now() - cached.cachedAt,
            });
            hydratedFromCache = true;
            lastGoodPeaksRef.current = cached.peaks;
            lastGoodCachedAtRef.current = cached.cachedAt;
            publishLastGood();
          }
        }

        if (offline) {
          if (!publishLastGood()) publish({ status: 'error', error: 'OFFLINE_NO_CACHE' });
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
        if (hydratedFromCache && lastGoodPeaksRef.current !== null && DEBUG) {
          console.debug('[useFavorites] fetch failed, fallback cache', {
            count: lastGoodPeaksRef.current.length, age: Date.now() - (lastGoodCachedAtRef.current ?? Date.now()),
          });
        }
        if (!publishLastGood()) publish({ status: 'error', error: message });
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
  }, [accountKey, anonymous, userId, publish, publishLastGood, readCache, writeCache]);

  useEffect(() => {
    void load({ force: true, reason: 'mount-or-session' });
  }, [load]);

  /** Applique une mutation réussie à la liste connue ; sans liste connue, relit le serveur. */
  const applyMutation = useCallback(async (
    mutation: FavoriteMutationInput,
    apply: (current: Peak[]) => Peak[],
  ): Promise<void> => {
    if (!userId) return;
    const revision = ++mutationRevisionRef.current;
    if (inFlightRef.current) mutationJournalRef.current.push({ ...mutation, revision });
    if (lastGoodPeaksRef.current === null) {
      // Pas de base fiable : publier [nouveau favori] serait une liste partielle.
      if (!inFlightRef.current) await load({ force: true, reason: 'mutation' });
      return;
    }
    const next = apply(lastGoodPeaksRef.current);
    lastGoodPeaksRef.current = next;
    lastGoodCachedAtRef.current = null;
    lastFetchedAtRef.current = Date.now();
    publish({ status: 'success', data: next });
    await writeCache(userId, next);
  }, [userId, load, publish, writeCache]);

  const addFavorite = useCallback(async (peakId: string): Promise<void> => {
    const token = tokenRef.current;
    if (!token) return;
    if (anonymous) {
      requireAccount({ kind: 'favorite', peakId });
      return;
    }
    if (DEBUG) console.debug('[useFavorites] addFavorite', { peakId });
    try {
      const favorite = await apiAddFavorite(token, peakId);
      if (accountKeyRef.current !== accountKey) return;
      await applyMutation(
        { kind: 'add', peak: favorite.peak },
        (current) => current.some((peak) => peak.id === favorite.peak.id)
          ? current : [...current, favorite.peak],
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      if (DEBUG) console.debug('[useFavorites] addFavorite error', { message });
    }
  }, [accountKey, anonymous, requireAccount, applyMutation]);

  const removeFavorite = useCallback(async (peakId: string): Promise<void> => {
    const token = tokenRef.current;
    if (!token || anonymous) return;
    if (DEBUG) console.debug('[useFavorites] removeFavorite', { peakId });
    try {
      await apiRemoveFavorite(token, peakId);
      if (accountKeyRef.current !== accountKey) return;
      await applyMutation(
        { kind: 'remove', peakId },
        (current) => current.filter((peak) => peak.id !== peakId),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      if (DEBUG) console.debug('[useFavorites] removeFavorite error', { message });
    }
  }, [accountKey, anonymous, applyMutation]);

  const refresh = useCallback(() => load({ force: true, reason: 'manual' }), [load]);
  const revalidate = useCallback(() => load({ force: false, reason: 'focus' }), [load]);
  const visible = snapshot.accountKey === accountKey ? snapshot : {
    accountKey, state: { status: 'loading' } as AsyncState<Peak[]>, fromCache: false, cachedAt: null,
  };

  return useMemo(() => ({
    state: visible.state, fromCache: visible.fromCache, cachedAt: visible.cachedAt,
    addFavorite, removeFavorite, refresh, revalidate,
  }), [visible.state, visible.fromCache, visible.cachedAt, addFavorite, removeFavorite, refresh, revalidate]);
}
