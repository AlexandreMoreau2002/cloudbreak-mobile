const { describe, it, expect } = require('@jest/globals');
const { addSceneManifest, patchAppDelegate } = require('./iosSceneLifecycle');

const SDK_57_APP_DELEGATE = `@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let factory = ExpoReactNativeFactory(delegate: delegate)

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
`;

describe('patchAppDelegate', () => {
  it('adopte ExpoReactNativeFactoryProvider et retire la creation de fenetre', () => {
    const result = patchAppDelegate(SDK_57_APP_DELEGATE);

    expect(result).toContain('class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
    expect(result).not.toContain('startReactNative');
    expect(result).not.toContain('UIWindow(frame:');
    expect(result).toContain('return super.application(application, didFinishLaunchingWithOptions');
  });

  it('est idempotent', () => {
    const once = patchAppDelegate(SDK_57_APP_DELEGATE);

    expect(patchAppDelegate(once)).toBe(once);
  });

  it('echoue si la declaration de classe est introuvable', () => {
    expect(() => patchAppDelegate('class Other {}')).toThrow(/ExpoAppDelegate/);
  });

  it('echoue si startReactNative reste present sous une forme inattendue', () => {
    const changed = SDK_57_APP_DELEGATE.replace('in: window,', 'in: self.window,');

    expect(() => patchAppDelegate(changed)).toThrow(/window creation block/);
  });

  it('ne touche pas un template deja conforme sans startReactNative', () => {
    const source = 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {\n}\n';

    expect(patchAppDelegate(source)).toBe(source);
  });
});

describe('addSceneManifest', () => {
  it('ajoute la configuration de scene par defaut sans ecraser les cles existantes', () => {
    const result = addSceneManifest({ CFBundleName: 'App' });

    expect(result.CFBundleName).toBe('App');
    expect(result.UIApplicationSceneManifest).toEqual({
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    });
  });

  it('est idempotent', () => {
    const once = addSceneManifest({});

    expect(addSceneManifest(once)).toEqual(once);
  });
});
