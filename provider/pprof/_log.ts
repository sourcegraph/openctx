/**
 * _log is a local debugging util that writes logs to a log file at $HOME/log/openctx/provider-pprof.log.
 * I could not find a way to log things to VSCode Output, so I came up with this workaround.
 *
 * This file is not imported anywhere, so no directories will be created on your machine
 * with `pprof` provider enabled.
 *
 * It's only a temporary fixture -- there's probably a better solution to this.
 */

import { appendFileSync, closeSync, mkdirSync, openSync, statSync } from 'node:fs'
import { join } from 'node:path'

const logDir = `${process.env.HOME}/log/openctx`
const logFile = join(logDir, 'provider-pprof.log')

try {
    statSync(logDir)
} catch {
    mkdirSync(logDir, { recursive: true })
}
closeSync(openSync(logFile, 'w'))

/**
 * DEBUG writes logs to $HOME/log/openctx/provider-pprof.log
 * To watch the logs run:
 *
 * ```
 * tail -f $HOME/log/openctx/provider-pprof.log
 * ```
 */
export default function DEBUG(message?: any, ...args: any[]): void {
    const now = new Date(Date.now()).toUTCString()
    appendFileSync(logFile, `[${now}] ${message}${args.join(' ')}` + '\n')
}
