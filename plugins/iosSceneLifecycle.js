const SCENE_DELEGATE_CLASS = 'SceneDelegate';
const SCENE_DELEGATE_FILE = 'SceneDelegate.swift';

const SCENE_DELEGATE_SOURCE = `internal import Expo

@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  // Extension point for config plugins.
}
`;

const PROVIDER_PROTOCOL = 'ExpoReactNativeFactoryProvider';
const CLASS_DECLARATION = /^class AppDelegate: ExpoAppDelegate(, [\w, ]+)? \{$/m;
const WINDOW_BLOCK =
  /^#if os\(iOS\) \|\| os\(tvOS\)\n {4}window = UIWindow\(frame: UIScreen\.main\.bounds\)\n {4}factory\.startReactNative\(\n {6}withModuleName: "main",\n {6}in: window,\n {6}launchOptions: launchOptions\)\n#endif\n/m;
const WINDOW_BLOCK_REPLACEMENT = `    // The window is created and React Native is started by \`SceneDelegate\` under the
    // scene-based life cycle (required by the iOS 27 SDK).
`;

function addSceneManifest(infoPlist) {
  return {
    ...infoPlist,
    UIApplicationSceneManifest: {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: `$(PRODUCT_MODULE_NAME).${SCENE_DELEGATE_CLASS}`,
          },
        ],
      },
    },
  };
}

function patchAppDelegate(source) {
  const declaration = source.match(CLASS_DECLARATION);
  if (!declaration) {
    throw new Error(
      'withIosSceneLifecycle: "class AppDelegate: ExpoAppDelegate" not found in AppDelegate.swift. ' +
        'The Expo template changed; update plugins/iosSceneLifecycle.js.'
    );
  }

  let result = source;
  const conformances = declaration[1] ?? '';

  if (!conformances.includes(PROVIDER_PROTOCOL)) {
    result = result.replace(
      CLASS_DECLARATION,
      `class AppDelegate: ExpoAppDelegate${conformances}, ${PROVIDER_PROTOCOL} {`
    );
  }

  if (WINDOW_BLOCK.test(result)) {
    result = result.replace(WINDOW_BLOCK, WINDOW_BLOCK_REPLACEMENT);
  } else if (result.includes('factory.startReactNative(')) {
    throw new Error(
      'withIosSceneLifecycle: window creation block not found in AppDelegate.swift but ' +
        'startReactNative is still called there. The Expo template changed; update plugins/iosSceneLifecycle.js.'
    );
  }

  return result;
}

module.exports = {
  SCENE_DELEGATE_FILE,
  SCENE_DELEGATE_SOURCE,
  addSceneManifest,
  patchAppDelegate,
};
