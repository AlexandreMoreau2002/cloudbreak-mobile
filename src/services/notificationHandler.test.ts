import * as Notifications from 'expo-notifications';

jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn() }));

const setHandler = Notifications.setNotificationHandler as jest.Mock;

async function getHandler() {
  jest.isolateModules(() => {
    require('@/services/notificationHandler');
  });
  return setHandler.mock.calls[0][0].handleNotification as (n: unknown) => Promise<{
    shouldShowBanner: boolean;
    shouldShowList: boolean;
    shouldPlaySound: boolean;
    shouldSetBadge: boolean;
  }>;
}

const notification = (data?: object) => ({ request: { content: { data } } });

beforeEach(() => setHandler.mockClear());

it('enregistre le handler au chargement du module', async () => {
  await getHandler();
  expect(setHandler).toHaveBeenCalledTimes(1);
});

it('affiche la bannière et la liste pour une alerte favoris, sans son ni badge', async () => {
  const handle = await getHandler();
  expect(await handle(notification({ type: 'favorite_alert', slug: 'a' }))).toEqual({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  });
});

it.each([
  ['terrain', notification({ type: 'terrain' })],
  ['type inconnu', notification({ type: 'other' })],
  ['sans data', notification(undefined)],
])('reste silencieuse au premier plan : %s', async (_l, n) => {
  const handle = await getHandler();
  expect(await handle(n)).toEqual({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  });
});
