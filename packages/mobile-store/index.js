const { Buffer } = require("buffer");

// Polyfill Buffer before loading the app module.
global.Buffer = global.Buffer || Buffer;

const { registerRootComponent } = require("expo");
const App = require("./App").default;

registerRootComponent(App);
