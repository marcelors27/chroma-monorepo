const { NodeSDK } = require("@opentelemetry/sdk-node")
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node")
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-proto")
const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-proto")
const { OTLPLogExporter } = require("@opentelemetry/exporter-logs-otlp-proto")
const { BatchLogRecordProcessor } = require("@opentelemetry/sdk-logs")
const { PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics")
const { logs, SeverityNumber } = require("@opentelemetry/api-logs")
const { context, trace } = require("@opentelemetry/api")

const hasOtelEndpoint = Boolean(
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
    process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT
)

const isExplicitlyEnabled = process.env.OTEL_ENABLED === "true"
const isExplicitlyDisabled = process.env.OTEL_ENABLED === "false"
const isProduction = process.env.NODE_ENV === "production"

const isOtelEnabled =
  !isExplicitlyDisabled && hasOtelEndpoint && (isProduction || isExplicitlyEnabled)

if (!isOtelEnabled) {
  return
}

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  metricReader:
    process.env.OTEL_METRICS_ENABLED === "false"
      ? undefined
      : new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter(),
        }),
  logRecordProcessors: [new BatchLogRecordProcessor(new OTLPLogExporter())],
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-aws-sdk": { enabled: false },
      "@opentelemetry/instrumentation-http":
        process.env.OTEL_METRICS_ENABLED === "false" ? { enabled: false } : undefined,
    }),
  ],
})

console.info("[otel] bootstrap loaded", {
  enabled: isOtelEnabled,
  metricsEnabled: process.env.OTEL_METRICS_ENABLED !== "false",
  nodeEnv: process.env.NODE_ENV,
})

tryStartSdk(sdk)

process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
})

function patchConsoleLogs() {
  if (process.env.OTEL_LOGS_ENABLED === "false") return

  const logger = logs.getLogger("console")
  const minLevel = normalizeMinLevel(process.env.OTEL_LOGS_LEVEL || "debug")
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
        const inferred = inferLogLevel(args, method)
        const { severityNumber, severityText } = inferred || levelMap[method]
        if (severityNumber < minLevel) return

        const { message, attributes } = extractLogMessageAndAttributes(args)
        logger.emit({
          severityNumber,
          severityText,
          body: message,
          attributes,
        })
      } catch {
        // never block app logging
      }
    }
  })
}

function patchStdIoLogs() {
  if (process.env.OTEL_LOGS_ENABLED === "false") return
  if (process.env.OTEL_LOGS_CAPTURE_STDIO === "false") return

  const logger = logs.getLogger("stdio")
  const minLevel = normalizeMinLevel(process.env.OTEL_LOGS_LEVEL || "debug")
  const writeStdout = process.stdout.write.bind(process.stdout)
  const writeStderr = process.stderr.write.bind(process.stderr)

  process.stdout.write = (chunk, encoding, cb) => {
    emitStdIoLog(logger, chunk, SeverityNumber.INFO, minLevel)
    return writeStdout(chunk, encoding, cb)
  }

  process.stderr.write = (chunk, encoding, cb) => {
    emitStdIoLog(logger, chunk, SeverityNumber.ERROR, minLevel)
    return writeStderr(chunk, encoding, cb)
  }
}

function emitStdIoLog(logger, chunk, severityNumber, minLevel) {
  if (severityNumber < minLevel) return
  const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk)
  const lines = text.split(/\r?\n/).filter(Boolean)
  for (const line of lines) {
    logger.emit({
      severityNumber,
      severityText: severityNumber === SeverityNumber.ERROR ? "ERROR" : "INFO",
      body: line,
      attributes: { source: "stdio" },
    })
  }
}

function tryStartSdk(sdkInstance) {
  try {
    const result = sdkInstance.start()
    if (result && typeof result.then === "function") {
      return result
        .then(() => {
          patchConsoleLogs()
          patchStdIoLogs()
        })
        .catch((error) => {
          console.error("[otel] failed to start:", error)
        })
    }
    patchConsoleLogs()
    patchStdIoLogs()
    return result
  } catch (error) {
    console.error("[otel] failed to start:", error)
    return undefined
  }
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

function normalizeMinLevel(level) {
  switch (String(level).toLowerCase()) {
    case "error":
      return SeverityNumber.ERROR
    case "warn":
    case "warning":
      return SeverityNumber.WARN
    case "info":
      return SeverityNumber.INFO
    case "debug":
    case "trace":
    default:
      return SeverityNumber.DEBUG
  }
}

function inferLogLevel(args) {
  const first = args?.[0]
  if (!first || typeof first !== "object") return null
  const level = first.level ?? first.severity ?? first.severityText
  if (!level) return null
  const normalized = String(level).toLowerCase()
  if (["fatal", "error"].includes(normalized)) {
    return { severityNumber: SeverityNumber.ERROR, severityText: "ERROR" }
  }
  if (["warn", "warning"].includes(normalized)) {
    return { severityNumber: SeverityNumber.WARN, severityText: "WARN" }
  }
  if (["info", "information"].includes(normalized)) {
    return { severityNumber: SeverityNumber.INFO, severityText: "INFO" }
  }
  if (["debug", "trace"].includes(normalized)) {
    return { severityNumber: SeverityNumber.DEBUG, severityText: "DEBUG" }
  }
  return null
}

function extractLogMessageAndAttributes(args) {
  if (!args?.length) return { message: "", attributes: {} }
  const attributes = {}
  addTraceContext(attributes)
  const messageParts = []
  for (const arg of args) {
    if (arg instanceof Error) {
      attributes["error.type"] = arg.name
      attributes["error.message"] = arg.message
      attributes["error.stack"] = arg.stack
      messageParts.push(arg.message)
      continue
    }
    if (typeof arg === "object" && arg !== null) {
      Object.entries(arg).forEach(([key, value]) => {
        if (key === "message" || key === "msg") {
          messageParts.push(String(value))
        } else if (value !== undefined) {
          attributes[key] = value
        }
      })
      if (!("message" in arg) && !("msg" in arg)) {
        messageParts.push(formatLogArg(arg))
      }
      continue
    }
    messageParts.push(formatLogArg(arg))
  }
  return { message: messageParts.join(" "), attributes }
}

function addTraceContext(attributes) {
  try {
    const activeSpan = trace.getSpan(context.active())
    const spanContext = activeSpan?.spanContext?.()
    if (!spanContext) return
    attributes["trace_id"] = spanContext.traceId
    attributes["span_id"] = spanContext.spanId
    attributes["trace_flags"] = spanContext.traceFlags
  } catch {
    // ignore context errors
  }
}
