const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const TIMEOUT_MS = '120000';

/**
 * Raise Gradle Wrapper download timeout so EAS is less likely to fail with:
 * "Downloading ... gradle-*.zip failed: timeout (10000ms)"
 */
function withGradleNetworkTimeout(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const wrapperPath = path.join(
        cfg.modRequest.platformProjectRoot,
        'gradle',
        'wrapper',
        'gradle-wrapper.properties'
      );

      if (!fs.existsSync(wrapperPath)) {
        return cfg;
      }

      let contents = fs.readFileSync(wrapperPath, 'utf8');
      if (/^networkTimeout=/m.test(contents)) {
        contents = contents.replace(/^networkTimeout=\d+/m, `networkTimeout=${TIMEOUT_MS}`);
      } else {
        contents = `${contents.trimEnd()}\nnetworkTimeout=${TIMEOUT_MS}\n`;
      }
      fs.writeFileSync(wrapperPath, contents);
      return cfg;
    },
  ]);
}

module.exports = withGradleNetworkTimeout;
