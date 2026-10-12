import createConfig from './app.config';

type PluginEntry = string | [string, Record<string, unknown>];

function locationPluginOptions(): Record<string, unknown> | undefined {
  const config = createConfig({ config: {} as never, projectRoot: '.' } as never);
  const entry = (config.plugins as PluginEntry[]).find(
    (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-location',
  );
  return Array.isArray(entry) ? entry[1] : undefined;
}

describe('app.config — plugin expo-location', () => {
  it('active la localisation en arrière-plan iOS (UIBackgroundModes=location, requis par le geofencing)', () => {
    expect(locationPluginOptions()?.isIosBackgroundLocationEnabled).toBe(true);
  });

  it('fournit le texte de justification « Toujours »', () => {
    expect(locationPluginOptions()?.locationAlwaysAndWhenInUsePermission).toEqual(
      expect.stringContaining('sommet'),
    );
  });
});
