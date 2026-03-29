import { Alert, Share } from 'react-native';
import { getShareForecastUrl, shareForecast } from '@/services/shareForecast';

jest.mock('@/utils/i18n', () => ({
  t: (key: string) => {
    const map: Record<string, string> = {
      'home.shareFailedTitle': 'Partage indisponible',
    };
    return map[key] ?? key;
  },
}));

describe('shareForecast', () => {
  it('construit l url de partage depuis un slug', () => {
    expect(getShareForecastUrl('mont-blanc')).toBe('reminder_modify_before_mep@cloudbreak.com/sommet/mont-blanc');
    expect(getShareForecastUrl(null)).toBeNull();
  });

  it('partage le lien de prévision avec le slug du sommet', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValueOnce({} as never);

    await shareForecast('mont-blanc');

    expect(shareSpy).toHaveBeenCalledWith({
      message: 'reminder_modify_before_mep@cloudbreak.com/sommet/mont-blanc',
      url: 'reminder_modify_before_mep@cloudbreak.com/sommet/mont-blanc',
    });
    shareSpy.mockRestore();
  });

  it('ignore le partage si aucun slug n est disponible', async () => {
    const shareSpy = jest.fn();
    const alertSpy = jest.fn();

    await shareForecast(null, shareSpy, alertSpy);

    expect(shareSpy).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("affiche une alerte si le partage natif échoue", async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockRejectedValueOnce(new Error('no share'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    await shareForecast('mont-blanc');

    expect(alertSpy).toHaveBeenCalledWith(
      'Partage indisponible',
      'reminder_modify_before_mep@cloudbreak.com/sommet/mont-blanc',
    );
    shareSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
