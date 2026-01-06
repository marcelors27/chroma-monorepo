const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withTamagui } = require("@tamagui/metro-plugin");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.resolver.sourceExts = Array.from(
  new Set([...(config.resolver.sourceExts || []), "ts", "tsx", "cjs", "mjs"])
);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = withTamagui(config, {
  config: "./tamagui.config.ts",
  components: ["tamagui", "@tamagui/core"],
});
