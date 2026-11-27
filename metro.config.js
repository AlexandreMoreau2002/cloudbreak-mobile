const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname, {
  includeWebFeedback: false,
  includeWebReplay: false,
});

// Exclure les fichiers de test du bundle
config.resolver.blockList = [/\.test\.[jt]sx?$/, /\.spec\.[jt]sx?$/];

module.exports = config;
