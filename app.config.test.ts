import { existsSync, readFileSync } from 'fs';
import createConfig from './app.config';

type PluginEntry = string | [string, Record<string, unknown>];

function locationPluginOptions(): Record<string, unknown> | undefined {
  const config = createConfig({
    config: {} as never,
    projectRoot: '.',
  } as never);
  const entry = (config.plugins as PluginEntry[]).find(
    (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-location',
  );
  return Array.isArray(entry) ? entry[1] : undefined;
}

describe('app.config — plugin expo-location (foreground uniquement)', () => {
  it("n'active pas la localisation en arrière-plan iOS (pas de UIBackgroundModes=location)", () => {
    expect(locationPluginOptions()?.isIosBackgroundLocationEnabled).toBe(false);
  });

  it("garde la justification « Pendant l'utilisation »", () => {
    expect(locationPluginOptions()?.locationWhenInUsePermission).toEqual(
      expect.stringContaining('sommet'),
    );
  });

  it("retire les clés « Toujours » de l'Info.plist", () => {
    const options = locationPluginOptions();
    expect(options?.locationAlwaysAndWhenInUsePermission).toBe(false);
    expect(options?.locationAlwaysPermission).toBe(false);
  });
});

describe('app.config — plugins sans permissions inutiles', () => {
  function pluginOptions(name: string): Record<string, unknown> | undefined {
    const config = createConfig({
      config: {} as never,
      projectRoot: '.',
    } as never);
    const entry = (config.plugins as PluginEntry[]).find(
      (plugin) => Array.isArray(plugin) && plugin[0] === name,
    );
    return Array.isArray(entry) ? entry[1] : undefined;
  }

  it("retire NSFaceIDUsageDescription (expo-secure-store n'utilise pas Face ID)", () => {
    expect(pluginOptions('expo-secure-store')?.faceIDPermission).toBe(false);
  });

  it('retire NSMotionUsageDescription (expo-location sans activité de mouvement)', () => {
    expect(pluginOptions('expo-location')?.motionUsagePermission).toBe(false);
  });
});

describe('app.config — textes de permission localisés', () => {
  const config = createConfig({
    config: {} as never,
    projectRoot: '.',
  } as never);
  const locales = config.locales as Record<string, string>;

  it.each(['fr', 'en'])('déclare un fichier de traduction existant pour %s', (lang) => {
    expect(existsSync(locales[lang])).toBe(true);
  });

  it.each(['fr', 'en'])('traduit NSLocationWhenInUseUsageDescription en %s', (lang) => {
    const strings = JSON.parse(readFileSync(locales[lang], 'utf8'));
    expect(strings.NSLocationWhenInUseUsageDescription).toEqual(expect.any(String));
    expect(strings.NSLocationWhenInUseUsageDescription.length).toBeGreaterThan(10);
  });
});

describe('app.config — splash screen aux couleurs de la DA', () => {
  const config = createConfig({ config: {} as never, projectRoot: '.' } as never);
  const entry = (config.plugins as PluginEntry[]).find(
    (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen',
  );
  const options = (Array.isArray(entry) ? entry[1] : {}) as {
    backgroundColor?: string;
    image?: string;
    dark?: { backgroundColor?: string; image?: string };
  };

  it('utilise le fond crème en light et le fond sombre en dark', () => {
    expect(options.backgroundColor).toBe('#EFE8DC');
    expect(options.dark?.backgroundColor).toBe('#1A1A1A');
  });

  it('fournit une image light et dark existantes (nécessaire pour lier la couleur au storyboard)', () => {
    expect(existsSync(options.image ?? '')).toBe(true);
    expect(existsSync(options.dark?.image ?? '')).toBe(true);
  });
});
