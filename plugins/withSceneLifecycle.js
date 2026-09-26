/**
 * Adopts the UIScene lifecycle on iOS.
 *
 * iOS 27 terminates apps built against the iOS 27 SDK that still use the
 * legacy app-delegate-only lifecycle (UIKit trap in
 * _UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption). Expo's
 * template (as of SDK 57) does not adopt scenes yet, so this plugin:
 *   1. declares a UIApplicationSceneManifest in Info.plist,
 *   2. stops AppDelegate from creating the window itself,
 *   3. appends a SceneDelegate that creates the window and starts React Native.
 *
 * Remove once Expo's template ships a SceneDelegate.
 */
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const MARKER = '// @generated withSceneLifecycle';

const WINDOW_START_REGEX =
  /#if os\(iOS\) \|\| os\(tvOS\)\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*factory\.startReactNative\([\s\S]*?\)\s*#endif\n?/;

const SCENE_DELEGATE = `
${MARKER}
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }

    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)

    if let userActivity = connectionOptions.userActivities.first {
      self.scene(scene, continue: userActivity)
    }
  }

  // Linking API
  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let context = URLContexts.first else { return }
    var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    options[.sourceApplication] = context.options.sourceApplication
    options[.annotation] = context.options.annotation
    options[.openInPlace] = context.options.openInPlace
    _ = UIApplication.shared.delegate?.application?(UIApplication.shared, open: context.url, options: options)
  }

  // Universal Links
  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = UIApplication.shared.delegate?.application?(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in })
  }
}
`;

function withSceneManifest(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return config;
  });
}

function withSceneDelegate(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error('withSceneLifecycle: only Swift AppDelegates are supported');
    }
    let contents = config.modResults.contents;
    if (contents.includes(MARKER)) return config;

    if (!WINDOW_START_REGEX.test(contents)) {
      throw new Error(
        'withSceneLifecycle: could not find the window/startReactNative block in AppDelegate.swift; the Expo template may have changed.',
      );
    }
    contents = contents.replace(WINDOW_START_REGEX, '');
    config.modResults.contents = contents.trimEnd() + '\n' + SCENE_DELEGATE;
    return config;
  });
}

module.exports = function withSceneLifecycle(config) {
  return withSceneDelegate(withSceneManifest(config));
};
