module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./src",
          },
        },
      ],
      [
        "@tamagui/babel-plugin",
        {
          config: "./tamagui.config.ts",
          components: ["tamagui", "@tamagui/core"],
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
