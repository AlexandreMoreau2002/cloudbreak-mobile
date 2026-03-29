import i18n from '@/utils/i18n';
import { Alert, Share } from 'react-native';

export function getShareForecastUrl(slug: string | null): string | null {
  return slug ? `reminder_modify_before_mep@cloudbreak.com/sommet/${slug}` : null;
}

export async function shareForecast(
  slug: string | null,
  shareImpl?: typeof Share.share,
  alertImpl?: typeof Alert.alert,
): Promise<void> {
  const shareUrl = getShareForecastUrl(slug);
  if (!shareUrl) {
    return;
  }

  const resolvedShareImpl = shareImpl ?? Share.share;
  const resolvedAlertImpl = alertImpl ?? Alert.alert;

  try {
    await resolvedShareImpl({
      message: shareUrl,
      url: shareUrl,
    });
  } catch {
    resolvedAlertImpl(i18n.t('home.shareFailedTitle'), shareUrl);
  }
}
