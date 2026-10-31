import { ExpoConfig, ConfigContext } from 'expo/config';

const { getAssociatedDomains } = require('./plugins/associatedDomains');

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Cloudbreak – Mer de nuage',
  slug: 'cloudbreak',
  userInterfaceStyle: 'automatic',
  // Textes de permission iOS localisés (InfoPlist.strings générés au prebuild depuis ces fichiers).
  locales: {
    fr: './locales/fr.json',
    en: './locales/en.json',
  },
  ios: {
    ...config.ios,
    infoPlist: {
      ...config.ios?.infoPlist,
      // Langues réellement fournies (cf. `locales`).
      CFBundleLocalizations: ['fr', 'en'],
    },
    associatedDomains: getAssociatedDomains(
      process.env.EXPO_PUBLIC_LEGAL_BASE_URL ?? 'https://ops.cloudbreak-app.com',
    ),
  },
  plugins: [
    'expo-image',
    'expo-web-browser',
    'expo-apple-authentication',
    // Pas de Face ID : le Keychain sans authentification biométrique suffit (aucun accès biométrique demandé).
    ['expo-secure-store', { faceIDPermission: false }],
    './plugins/withIosSceneLifecycle',
    [
      'expo-splash-screen',
      {
        // DA : fond light #EFE8DC / dark #1A1A1A, mascotte de marque. `splash-icon.png` est le glyphe
        // blanc du template Expo (hors marque, invisible sur crème). Sans image, le plugin ne relie
        // pas la couleur au storyboard : l'image est donc obligatoire pour appliquer le fond.
        backgroundColor: '#EFE8DC',
        image: './assets/images/brand/mascot-full-light-cut.png',
        imageWidth: 200,
        dark: {
          backgroundColor: '#1A1A1A',
          image: './assets/images/brand/mascot-full-dark-cut.png',
        },
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Pour confirmer ta présence au sommet.',
        // Foreground uniquement : `false` retire les clés « Toujours » et UIBackgroundModes=location.
        locationAlwaysAndWhenInUsePermission: false,
        locationAlwaysPermission: false,
        isIosBackgroundLocationEnabled: false,
        // Pas d'activité de mouvement : retire NSMotionUsageDescription (texte générique anglais).
        motionUsagePermission: false,
      },
    ],
  ],
  extra: {
    ...config.extra,
    supabaseUrl: process.env.SUPABASE_URL ?? 'https://yggehvcwxiqrkhsoxrxe.supabase.co',
    supabaseKey: process.env.SUPABASE_KEY ?? 'sb_publishable_kvTa5gayV_CeR2V9W08_CQ_oU0yPhak',
  },
});
