import { redactSensitive } from './redaction.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface StructuredLogFields {
  timestamp?: string;
  level?: LogLevel;
  event: string;
  correlationId?: string | null;
  requestId?: string | null;
  method?: string;
  route?: string;
  operation?: string | null;
  statusCode?: number | null;
  durationMs?: number | null;
  idempotencyKeyHash?: string | null;
  idempotencyReplay?: boolean;
  resourceType?: string | null;
  resourceId?: string | null;
  persistenceProvider?: string | null;
  errorCode?: string | null;
  provider?: string | null;
  attempt?: number | null;
  cacheHit?: boolean | null;
  retry?: boolean | null;
  fallbackUsed?: boolean | null;
  [key: string]: unknown;
}

export interface StructuredLogger {
  log(level: LogLevel, fields: StructuredLogFields): void;
  debug(fields: StructuredLogFields): void;
  info(fields: StructuredLogFields): void;
  warn(fields: StructuredLogFields): void;
  error(fields: StructuredLogFields): void;
  drain(): StructuredLogFields[];
  clear(): void;
}

export class ConsoleStructuredLogger implements StructuredLogger {
  private readonly buffer: StructuredLogFields[] = [];
  private readonly maxBuffer: number;

  constructor(options?: { maxBuffer?: number; capture?: boolean }) {
    this.maxBuffer = options?.maxBuffer ?? 200;
    this.capture = options?.capture ?? true;
  }

  private readonly capture: boolean;

  log(level: LogLevel, fields: StructuredLogFields): void {
    const entry: StructuredLogFields = redactSensitive({
      timestamp: new Date().toISOString(),
      level,
      ...fields,
    });
    if (this.capture) {
      this.buffer.push(entry);
      if (this.buffer.length > this.maxBuffer) {
        this.buffer.shift();
      }
    }
    const line = JSON.stringify(entry);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.info(line);
    }
  }

  debug(fields: StructuredLogFields): void {
    this.log('debug', fields);
  }

  info(fields: StructuredLogFields): void {
    this.log('info', fields);
  }

  warn(fields: StructuredLogFields): void {
    this.log('warn', fields);
  }

  error(fields: StructuredLogFields): void {
    this.log('error', fields);
  }

  drain(): StructuredLogFields[] {
    return [...this.buffer];
  }

  clear(): void {
    this.buffer.length = 0;
  }
}

let sharedLogger: StructuredLogger | null = null;

export function getStructuredLogger(): StructuredLogger {
  if (!sharedLogger) {
    sharedLogger = new ConsoleStructuredLogger({
      capture: process.env.NODE_ENV === 'test' || process.env.VITEST === 'true',
    });
  }
  return sharedLogger;
}

export function setStructuredLogger(logger: StructuredLogger): void {
  sharedLogger = logger;
}

export function resetStructuredLogger(): void {
  sharedLogger = null;
}
