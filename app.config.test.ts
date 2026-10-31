import createConfig from './app.config';

type PluginEntry = string | [string, Record<string, unknown>];

function locationPluginOptions(): Record<string, unknown> | undefined {
  const config = createConfig({ config: {} as never, projectRoot: '.' } as never);
  const entry = (config.plugins as PluginEntry[]).find(
    (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-location',
  );
  return Array.isArray(entry) ? entry[1] : undefined;
}

describe('app.config — plugin expo-location (foreground uniquement)', () => {
  it("n'active pas la localisation en arrière-plan iOS (pas de UIBackgroundModes=location)", () => {
    expect(locationPluginOptions()?.isIosBackgroundLocationEnabled).toBe(false);
  });

  it('garde la justification « Pendant l\'utilisation »', () => {
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
