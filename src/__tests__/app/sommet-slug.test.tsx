import { render, waitFor } from '@testing-library/react-native';

import SommetDeepLink from '@/app/sommet/[slug]';

const mockReplace = jest.fn();
const mockSetPending = jest.fn();
const mockParams: { slug?: string } = { slug: 'mont-blanc' };

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/utils/pendingPeakLink', () => ({
  setPendingPeakSlug: (...args: unknown[]) => mockSetPending(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.slug = 'mont-blanc';
  mockSetPending.mockResolvedValue(true);
});

describe('route /sommet/[slug]', () => {
  it('mémorise le slug puis redirige vers les onglets', async () => {
    render(<SommetDeepLink />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
    expect(mockSetPending).toHaveBeenCalledWith('mont-blanc');
  });

  it('redirige quand même vers les onglets si le slug est invalide', async () => {
    mockParams.slug = '../x';
    mockSetPending.mockResolvedValue(false);
    render(<SommetDeepLink />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
  });

  it("redirige sans rien mémoriser quand le slug n'est pas une chaîne", async () => {
    mockParams.slug = undefined;
    render(<SommetDeepLink />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
    expect(mockSetPending).not.toHaveBeenCalled();
  });
});
