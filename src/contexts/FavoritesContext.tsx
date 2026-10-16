/** Shared favorites list: one provider so Home, Favorites and Search read the same state. */
import React, { createContext, useContext } from 'react';

import { useFavoritesData, type FavoritesContextValue } from '@/hooks/useFavoritesData';

export type { FavoritesContextValue };

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const value = useFavoritesData();
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error('useFavorites must be used within FavoritesProvider');
  return value;
}
