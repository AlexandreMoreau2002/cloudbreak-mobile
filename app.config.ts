import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Cloudbreak',
  slug: 'mobile',
  userInterfaceStyle: 'automatic',
  plugins: [
    'expo-image',
    'expo-web-browser',
    'expo-apple-authentication',
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Pour confirmer ta présence au sommet.',
      },
    ],
  ],
  extra: {
    supabaseUrl: process.env.SUPABASE_URL ?? 'https://yggehvcwxiqrkhsoxrxe.supabase.co',
    supabaseKey: process.env.SUPABASE_KEY ?? 'sb_publishable_kvTa5gayV_CeR2V9W08_CQ_oU0yPhak',
  },
});
