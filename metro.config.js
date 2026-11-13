const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclure les fichiers de test du bundle
config.resolver.blockList = [/\.test\.[jt]sx?$/, /\.spec\.[jt]sx?$/];

module.exports = config;
