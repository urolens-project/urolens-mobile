/**
 * Raises the iOS deployment target to 16.0 for the app and every pod target.
 *
 * Xcode 27 rejects pod targets (e.g. resource bundles) below iOS 15.0, and
 * expo-router needs iOS 16 APIs. Expo's template defaults to 15.1, so without
 * this the build breaks after every `expo prebuild --clean`.
 */
const {
  withDangerousMod,
  withPodfileProperties,
  withXcodeProject,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MIN_IOS = '16.0';
const MARKER = '# @generated withIosDeploymentTarget';

const POST_INSTALL_SNIPPET = `
    ${MARKER}
    min_target = Gem::Version.new('${MIN_IOS}')
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        current = bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || Gem::Version.new(current.to_s) < min_target
          bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = min_target.to_s
        end
      end
    end
`;

function withPodfileMinTarget(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfile = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');
      if (contents.includes(MARKER)) return config;

      const anchor = /post_install do \|installer\|\n/;
      if (!anchor.test(contents)) {
        throw new Error('withIosDeploymentTarget: no post_install block found in Podfile');
      }
      contents = contents.replace(anchor, (match) => match + POST_INSTALL_SNIPPET);
      fs.writeFileSync(podfile, contents);
      return config;
    },
  ]);
}

function withAppTarget(config) {
  return withXcodeProject(config, (config) => {
    const configurations = config.modResults.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configurations)) {
      const settings = configurations[key].buildSettings;
      if (settings && settings.IPHONEOS_DEPLOYMENT_TARGET) {
        settings.IPHONEOS_DEPLOYMENT_TARGET = MIN_IOS;
      }
    }
    return config;
  });
}

module.exports = function withIosDeploymentTarget(config) {
  config = withPodfileProperties(config, (config) => {
    config.modResults['ios.deploymentTarget'] = MIN_IOS;
    return config;
  });
  return withPodfileMinTarget(withAppTarget(config));
};
