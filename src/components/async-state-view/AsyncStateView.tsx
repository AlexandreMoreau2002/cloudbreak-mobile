import { LoadingSpinner } from '@/components/loading-spinner';
import type { ReactNode } from 'react';

interface AsyncStateViewProps {
  isLoading: boolean;
  isEmpty: boolean;
  error?: string | null;
  loadingComponent?: ReactNode;
  emptyComponent: ReactNode;
  errorComponent?: ReactNode;
  children: ReactNode;
}

export function AsyncStateView({
  isLoading,
  isEmpty,
  error,
  loadingComponent,
  emptyComponent,
  errorComponent,
  children,
}: AsyncStateViewProps) {
  if (isLoading) return <>{loadingComponent ?? <LoadingSpinner />}</>;
  if (error) return <>{errorComponent ?? null}</>;
  if (isEmpty) return <>{emptyComponent}</>;
  return <>{children}</>;
}
