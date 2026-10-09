import { Alert } from 'react-native';
import { renderHook, waitFor } from '@testing-library/react-native';

import i18n from '@/utils/i18n';
import { usePendingPeakLink } from '@/hooks/usePendingPeakLink';

const mockFetchPeakBySlug = jest.fn();
const mockSetSelectedPeak = jest.fn();
const mockGetPending = jest.fn();
const mockClearPending = jest.fn();
const mockAuth = { session: { access_token: 'mock-token' } as { access_token: string } | null };
const mockOnboarding = { completed: true };
const mockSegments: { value: string[] } = { value: ['(tabs)'] };

jest.mock('expo-router', () => ({ useSegments: () => mockSegments.value }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('@/contexts/OnboardingContext', () => ({ useOnboarding: () => mockOnboarding }));
jest.mock('@/contexts/SelectedPeakContext', () => ({
  useSelectedPeak: () => ({ setSelectedPeak: mockSetSelectedPeak }),
}));
jest.mock('@/services/api/peaks', () => ({
  fetchPeakBySlug: (...args: unknown[]) => mockFetchPeakBySlug(...args),
}));
jest.mock('@/utils/pendingPeakLink', () => ({
  getPendingPeakSlug: () => mockGetPending(),
  clearPendingPeakSlug: () => mockClearPending(),
}));

const PEAK = { id: 'p1', slug: 'mont-blanc', name: 'Mont Blanc' };

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.session = { access_token: 'mock-token' };
  mockOnboarding.completed = true;
  mockSegments.value = ['(tabs)'];
  mockGetPending.mockResolvedValue('mont-blanc');
  mockFetchPeakBySlug.mockResolvedValue(PEAK);
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

describe('usePendingPeakLink', () => {
  it('sélectionne le sommet du slug en attente puis efface le slug', async () => {
    renderHook(() => usePendingPeakLink());
    await waitFor(() => expect(mockSetSelectedPeak).toHaveBeenCalledWith(PEAK));
    expect(mockFetchPeakBySlug).toHaveBeenCalledWith('mock-token', 'mont-blanc');
    expect(mockClearPending).toHaveBeenCalled();
  });

  it('ne fait rien sans slug en attente', async () => {
    mockGetPending.mockResolvedValue(null);
    renderHook(() => usePendingPeakLink());
    await waitFor(() => expect(mockGetPending).toHaveBeenCalled());
    expect(mockFetchPeakBySlug).not.toHaveBeenCalled();
  });

  it.each([
    ['sans session', () => { mockAuth.session = null; }],
    ['onboarding non terminé', () => { mockOnboarding.completed = false; }],
    ["sur l'écran onboarding", () => { mockSegments.value = ['onboarding']; }],
    ['sur la route sommet', () => { mockSegments.value = ['sommet', '[slug]']; }],
  ])('attend quand %s', async (_label, arrange) => {
    arrange();
    renderHook(() => usePendingPeakLink());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockGetPending).not.toHaveBeenCalled();
    expect(mockFetchPeakBySlug).not.toHaveBeenCalled();
  });

  it('alerte "sommet introuvable" sur le vrai 404 de apiFetch (httpStatus 404)', async () => {
    const notFound = Object.assign(new Error('Peak not found: unknown'), { httpStatus: 404 });
    mockFetchPeakBySlug.mockRejectedValue(notFound);
    renderHook(() => usePendingPeakLink());
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        i18n.t('deepLink.notFoundTitle'),
        i18n.t('deepLink.notFoundMessage'),
      ),
    );
    expect(mockClearPending).toHaveBeenCalled();
    expect(mockSetSelectedPeak).not.toHaveBeenCalled();
  });

  it('alerte "sommet introuvable" sur le 404 du mode MOCK_API', async () => {
    mockFetchPeakBySlug.mockRejectedValue(new Error('Peak not found'));
    renderHook(() => usePendingPeakLink());
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        i18n.t('deepLink.notFoundTitle'),
        i18n.t('deepLink.notFoundMessage'),
      ),
    );
    expect(mockClearPending).toHaveBeenCalled();
  });

  it('alerte générique sur autre erreur (réseau, 500) et efface le slug', async () => {
    mockFetchPeakBySlug.mockRejectedValue(
      Object.assign(new Error('boom'), { httpStatus: 500 }),
    );
    renderHook(() => usePendingPeakLink());
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        i18n.t('deepLink.errorTitle'),
        i18n.t('common.networkHint'),
      ),
    );
    expect(mockClearPending).toHaveBeenCalled();
  });

  it("traite un rejet qui n'est pas une Error comme une erreur générique", async () => {
    mockFetchPeakBySlug.mockRejectedValue('boom');
    renderHook(() => usePendingPeakLink());
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        i18n.t('deepLink.errorTitle'),
        i18n.t('common.networkHint'),
      ),
    );
  });

  it("ne lance pas deux consommations en parallèle quand l'écran change pendant le chargement", async () => {
    let release: (slug: string | null) => void = () => undefined;
    mockGetPending.mockReturnValueOnce(new Promise<string | null>((resolve) => { release = resolve; }));
    const { rerender } = renderHook(() => usePendingPeakLink());
    mockSegments.value = ['account'];
    rerender({});
    release('mont-blanc');
    await waitFor(() => expect(mockSetSelectedPeak).toHaveBeenCalledTimes(1));
    expect(mockGetPending).toHaveBeenCalledTimes(1);
  });
});
