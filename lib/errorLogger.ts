const LOG_QUEUE: {
  level: string
  message: string
  data?: unknown
  timestamp: string
}[] = []
const MAX_LOG_QUEUE = 50

export function logError(context: string, error: unknown, data?: unknown) {
  const entry = {
    level: 'error',
    message: `[${context}] ${error instanceof Error ? error.message : String(error)}`,
    data,
    timestamp: new Date().toISOString(),
  }

  if (process.env.NODE_ENV === 'development') {
    console.error(entry.message, data || '')
  }

  LOG_QUEUE.push(entry)
  if (LOG_QUEUE.length > MAX_LOG_QUEUE) {
    LOG_QUEUE.shift()
  }
}

export function logWarn(context: string, message: string, data?: unknown) {
  const entry = {
    level: 'warn',
    message: `[${context}] ${message}`,
    data,
    timestamp: new Date().toISOString(),
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn(entry.message, data || '')
  }

  LOG_QUEUE.push(entry)
  if (LOG_QUEUE.length > MAX_LOG_QUEUE) {
    LOG_QUEUE.shift()
  }
}

export function getRecentLogs() {
  return [...LOG_QUEUE]
}

export function clearLogs() {
  LOG_QUEUE.length = 0
}
