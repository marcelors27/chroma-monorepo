const { loadEnv } = require("./load-env")

loadEnv()

if (!process.env.REALTIME_EMBEDDED_WS) {
  process.env.REALTIME_EMBEDDED_WS = "true"
}

const { startRealtimeWsServer } = require("../src/services/realtime-ws")

startRealtimeWsServer(console)
