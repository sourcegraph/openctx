export type Logger = (message: string) => void

export function scopedLogger(logger: Logger, prefix: string): Logger
export function scopedLogger(logger: Logger | undefined, prefix: string): Logger | undefined
export function scopedLogger(logger: Logger | undefined, prefix: string): Logger | undefined {
    return logger
        ? (message: string) => {
              logger(`[${prefix}]: ${message}`)
          }
        : undefined
}
