import { Alert, Linking } from 'react-native';
import { LEGAL_URLS } from '@/constants/legalUrls';
import { useLegalLinks } from '@/hooks/useLegalLinks';
import { renderHook, act } from '@testing-library/react-native';

jest.mock('@/utils/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

jest.mock('@/services/analytics', () => ({ track: jest.fn() }));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn() },
}));

describe('useLegalLinks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ouvre le lien fourni via Linking.openURL', async () => {
    (Linking.openURL as jest.Mock).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useLegalLinks());

    await result.current.openLegalLink('https://ops.cloudbreak-app.com/fr/privacy');

    expect(Linking.openURL).toHaveBeenCalledWith('https://ops.cloudbreak-app.com/fr/privacy');
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('ouvre un lien mailto: via Linking.openURL', async () => {
    (Linking.openURL as jest.Mock).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useLegalLinks());

    await result.current.openLegalLink('mailto:support@cloudbreak.app');

    expect(Linking.openURL).toHaveBeenCalledWith('mailto:support@cloudbreak.app');
  });

  it("affiche une alerte si l'ouverture du lien échoue", async () => {
    (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('no handler'));
    const { result } = renderHook(() => useLegalLinks());

    await result.current.openLegalLink('https://ops.cloudbreak-app.com/fr/cgu');

    expect(Alert.alert).toHaveBeenCalledWith('legal.errorTitle', 'legal.errorMessage');
  });

  it('tracks legal_link_opened with link_type privacy', async () => {
    const { track } = jest.requireMock('@/services/analytics');
    (Linking.openURL as jest.Mock).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useLegalLinks());

    await act(async () => {
      await result.current.openLegalLink(LEGAL_URLS.privacy);
    });

    expect(track).toHaveBeenCalledWith('legal_link_opened', { link_type: 'privacy' });
  });

  it('tracks legal_link_opened with link_type other for an unknown url', async () => {
    const { track } = jest.requireMock('@/services/analytics');
    (Linking.openURL as jest.Mock).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useLegalLinks());

    await act(async () => {
      await result.current.openLegalLink('https://example.com');
    });

    expect(track).toHaveBeenCalledWith('legal_link_opened', { link_type: 'other' });
  });
});
