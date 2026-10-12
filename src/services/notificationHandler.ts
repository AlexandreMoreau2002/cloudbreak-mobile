/**
 * notificationHandler — comportement des notifications reçues app ouverte (premier plan).
 * iOS n'affiche rien sans handler : on n'affiche que les alertes favoris (story 5.2).
 * La notification terrain reste silencieuse : l'app ouvre déjà le sheet toute seule.
 *
 * Importé pour son effet de bord en tête de _layout.tsx (scope module).
 */
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const show = notification.request.content.data?.type === 'favorite_alert';
    return {
      shouldShowBanner: show,
      shouldShowList: show,
      shouldPlaySound: false,
      shouldSetBadge: false,
    };
  },
});
