import { Alert, Linking } from 'react-native';
import { useLegalLinks } from '@/hooks/useLegalLinks';
import { renderHook } from '@testing-library/react-native';

jest.mock('@/utils/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

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

    await result.current.openLegalLink('https://ops.cloudbreak.fr/fr/privacy');

    expect(Linking.openURL).toHaveBeenCalledWith('https://ops.cloudbreak.fr/fr/privacy');
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

    await result.current.openLegalLink('https://ops.cloudbreak.fr/fr/cgu');

    expect(Alert.alert).toHaveBeenCalledWith('legal.errorTitle', 'legal.errorMessage');
  });
});
