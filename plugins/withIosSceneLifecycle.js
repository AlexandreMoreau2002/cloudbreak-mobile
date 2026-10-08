const fs = require('fs');
const path = require('path');
const {
  IOSConfig,
  withInfoPlist,
  withXcodeProject,
  withDangerousMod,
} = require('expo/config-plugins');
const {
  SCENE_DELEGATE_FILE,
  SCENE_DELEGATE_SOURCE,
  addSceneManifest,
  patchAppDelegate,
} = require('./iosSceneLifecycle');

/**
 * Adopts the UIScene life cycle (required by the iOS 27 SDK) on Expo SDK 57, whose template
 * still creates the window in AppDelegate. Mirrors the SDK 58 template: Info.plist scene
 * manifest, a SceneDelegate subclassing ExpoAppSceneDelegate, and an AppDelegate conforming
 * to ExpoReactNativeFactoryProvider. Can be removed after upgrading to SDK 58.
 *
 * Plain CommonJS: Expo loads local plugins without a TypeScript transpile step.
 */
const withIosSceneLifecycle = (config) => {
  config = withInfoPlist(config, (mod) => {
    mod.modResults = addSceneManifest(mod.modResults);
    return mod;
  });

  config = withDangerousMod(config, [
    'ios',
    (mod) => {
      const { platformProjectRoot, projectName } = mod.modRequest;
      if (!projectName) {
        throw new Error('withIosSceneLifecycle: iOS project name could not be resolved.');
      }
      const appDir = path.join(platformProjectRoot, projectName);

      const appDelegatePath = path.join(appDir, 'AppDelegate.swift');
      const original = fs.readFileSync(appDelegatePath, 'utf8');
      const patched = patchAppDelegate(original);
      if (patched !== original) {
        fs.writeFileSync(appDelegatePath, patched);
      }

      fs.writeFileSync(path.join(appDir, SCENE_DELEGATE_FILE), SCENE_DELEGATE_SOURCE);
      return mod;
    },
  ]);

  config = withXcodeProject(config, (mod) => {
    const { projectName } = mod.modRequest;
    if (!projectName) {
      throw new Error('withIosSceneLifecycle: iOS project name could not be resolved.');
    }
    IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
      filepath: `${projectName}/${SCENE_DELEGATE_FILE}`,
      groupName: projectName,
      project: mod.modResults,
    });
    return mod;
  });

  return config;
};

module.exports = withIosSceneLifecycle;
