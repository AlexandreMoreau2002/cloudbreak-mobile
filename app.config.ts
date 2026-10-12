import { ExpoConfig, ConfigContext } from 'expo/config';

const { getAssociatedDomains } = require('./plugins/associatedDomains');

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Cloudbreak – Mer de nuage',
  slug: 'cloudbreak',
  userInterfaceStyle: 'automatic',
  ios: {
    ...config.ios,
    associatedDomains: getAssociatedDomains(
      process.env.EXPO_PUBLIC_LEGAL_BASE_URL ?? 'https://ops.cloudbreak-app.com',
    ),
  },
  plugins: [
    'expo-image',
    'expo-web-browser',
    'expo-apple-authentication',
    'expo-secure-store',
    './plugins/withIosSceneLifecycle',
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Pour confirmer ta présence au sommet.',
      },
    ],
  ],
  extra: {
    ...config.extra,
    supabaseUrl: process.env.SUPABASE_URL ?? 'https://yggehvcwxiqrkhsoxrxe.supabase.co',
    supabaseKey: process.env.SUPABASE_KEY ?? 'sb_publishable_kvTa5gayV_CeR2V9W08_CQ_oU0yPhak',
  },
});
