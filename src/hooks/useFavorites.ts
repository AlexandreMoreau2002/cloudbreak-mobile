/**
 * useFavorites — hook CRUD pour les favoris utilisateur.
 *
 * Usage :
 *   const { state, addFavorite, removeFavorite } = useFavorites();
 */
import { useCallback, useEffect, useState } from 'react';
import { DEBUG } from '@/constants/devConfig';
import { fetchFavorites, removeFavorite as apiRemoveFavorite } from '@/services/api/peaks';
import { addFavorite as apiAddFavorite } from '@/services/api/user';
import { useAuth } from '@/contexts/AuthContext';
import type { Peak } from '@/services/mockData/types';

export interface AsyncState<T> {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: T;
  error?: string;
}

export function useFavorites() {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const [state, setState] = useState<AsyncState<Peak[]>>({ status: 'idle' });

  const listFavorites = useCallback(async () => {
    if (!token) {
      setState({ status: 'error', error: 'Non authentifié' });
      return;
    }
    if (DEBUG) console.debug('[useFavorites] listFavorites');
    setState({ status: 'loading' });
    try {
      const favorites = await fetchFavorites(token);
      const peaks = favorites.map((f) => f.peak);
      if (DEBUG) console.debug('[useFavorites] listFavorites success', { count: peaks.length });
      setState({ status: 'success', data: peaks });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      if (DEBUG) console.debug('[useFavorites] listFavorites error', { message });
      setState({ status: 'error', error: message });
    }
  }, [token]);

  useEffect(() => {
    listFavorites();
  }, [listFavorites]);

  const addFavorite = useCallback(async (peakId: string) => {
    if (!token) return;
    if (DEBUG) console.debug('[useFavorites] addFavorite', { peakId });
    try {
      await apiAddFavorite(token, peakId);
      await listFavorites();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      if (DEBUG) console.debug('[useFavorites] addFavorite error', { message });
    }
  }, [token, listFavorites]);

  const removeFavorite = useCallback(async (peakId: string) => {
    if (!token) return;
    if (DEBUG) console.debug('[useFavorites] removeFavorite', { peakId });
    try {
      await apiRemoveFavorite(token, peakId);
      await listFavorites();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      if (DEBUG) console.debug('[useFavorites] removeFavorite error', { message });
    }
  }, [token, listFavorites]);

  return { state, addFavorite, removeFavorite, refresh: listFavorites };
}
