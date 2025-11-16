import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Custom format for console output
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'HH:mm:ss' }),
  format.printf(({ timestamp, level, message, module, ...metadata }) => {
    let msg = `${timestamp} [${level}]`;
    if (module) msg += ` [${module}]`;
    msg += ` ${message}`;
    if (Object.keys(metadata).length > 0 && metadata.service !== 'lyon-transit-backend') {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

const logger = createLogger({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'lyon-transit-backend' },
  transports: [
    new transports.Console({
      format: consoleFormat,
    }),
  ],
});

// Add daily rotating file transports for production
if (!isDevelopment) {
  // All logs with daily rotation
  logger.add(
    new DailyRotateFile({
      filename: path.join(__dirname, '../../logs/application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    })
  );

  // Error logs with daily rotation (kept longer)
  logger.add(
    new DailyRotateFile({
      filename: path.join(__dirname, '../../logs/error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
    })
  );
}

// Create child loggers for different modules
export const ingestionLogger = logger.child({ module: 'ingestion' });
export const apiLogger = logger.child({ module: 'api' });
export const dbLogger = logger.child({ module: 'database' });

export default logger;