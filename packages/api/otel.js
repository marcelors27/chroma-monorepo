const { NodeSDK } = require("@opentelemetry/sdk-node")
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node")
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-proto")
const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-proto")
const { OTLPLogExporter } = require("@opentelemetry/exporter-logs-otlp-proto")
const { BatchLogRecordProcessor } = require("@opentelemetry/sdk-logs")
const { PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics")
const { logs, SeverityNumber } = require("@opentelemetry/api-logs")

const isOtelEnabled = Boolean(
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
    process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT
)

if (!isOtelEnabled) {
  return
}

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
  }),
  logRecordProcessors: [new BatchLogRecordProcessor(new OTLPLogExporter())],
  instrumentations: [getNodeAutoInstrumentations()],
})

sdk
  .start()
  .then(() => {
    patchConsoleLogs()
  })
  .catch((error) => {
    console.error("[otel] failed to start:", error)
  })

process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
})

function patchConsoleLogs() {
  if (process.env.OTEL_LOGS_ENABLED === "false") return

  const logger = logs.getLogger("console")
  const levelMap = {
    debug: { severityNumber: SeverityNumber.DEBUG, severityText: "DEBUG" },
    info: { severityNumber: SeverityNumber.INFO, severityText: "INFO" },
    log: { severityNumber: SeverityNumber.INFO, severityText: "INFO" },
    warn: { severityNumber: SeverityNumber.WARN, severityText: "WARN" },
    error: { severityNumber: SeverityNumber.ERROR, severityText: "ERROR" },
  }

  Object.keys(levelMap).forEach((method) => {
    const original = console[method]
    console[method] = (...args) => {
      original.apply(console, args)
      try {
        const { severityNumber, severityText } = levelMap[method]
        logger.emit({
          severityNumber,
          severityText,
          body: args.map(formatLogArg).join(" "),
        })
      } catch {
        // never block app logging
      }
    }
  })
}

function formatLogArg(arg) {
  if (typeof arg === "string") return arg
  if (arg instanceof Error) return arg.stack || arg.message
  try {
    return JSON.stringify(arg)
  } catch {
    return String(arg)
  }
}
