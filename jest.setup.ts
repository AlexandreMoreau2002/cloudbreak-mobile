global.console.debug = () => {};

jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getPermissionsAsync: jest.fn(async () => ({ status: 'undetermined' })),
}));

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => (store.has(key) ? store.get(key)! : null)),
    setItemAsync: jest.fn(async (key: string, value: string) => { store.set(key, String(value)); }),
    deleteItemAsync: jest.fn(async (key: string) => { store.delete(key); }),
  };
});

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'undetermined' })),
}));

jest.mock('react-native-iap', () => ({
  ErrorCode: { UserCancelled: 'user-cancelled', Unknown: 'unknown' },
  endConnection: jest.fn(() => Promise.resolve()),
  fetchProducts: jest.fn(() => Promise.resolve([])),
  finishTransaction: jest.fn(() => Promise.resolve()),
  getAvailablePurchases: jest.fn(() => Promise.resolve([])),
  initConnection: jest.fn(() => Promise.resolve(true)),
  purchaseErrorListener: jest.fn(() => ({ remove: jest.fn() })),
  purchaseUpdatedListener: jest.fn(() => ({ remove: jest.fn() })),
  requestPurchase: jest.fn(() => Promise.resolve()),
}));

// Default stub so any test that transitively imports a component using icons
// (e.g. via a barrel file) doesn't need to know or care — real expo-font
// resolution isn't available/needed in the Jest environment. Test files that
// actually assert on icon props (e.g. AccountForm.test.tsx) override this
// locally with their own jest.mock('@expo/vector-icons', ...).
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
