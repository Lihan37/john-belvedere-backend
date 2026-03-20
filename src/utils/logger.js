import fs from 'fs'
import path from 'path'

const logDir = path.resolve(process.cwd(), 'logs')
const appLogPath = path.join(logDir, 'app.log')

function ensureLogDir() {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }
}

function write(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  }

  ensureLogDir()
  fs.appendFileSync(appLogPath, `${JSON.stringify(entry)}\n`)
  const printer = level === 'error' ? console.error : console.log
  printer(`[${level.toUpperCase()}] ${message}`, Object.keys(meta).length ? meta : '')
}

export const logger = {
  info(message, meta) {
    write('info', message, meta)
  },
  warn(message, meta) {
    write('warn', message, meta)
  },
  error(message, meta) {
    write('error', message, meta)
  },
}
