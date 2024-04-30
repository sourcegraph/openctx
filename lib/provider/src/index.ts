// Import from a subpackage because the main module calls `os.platform()`, which doesn't work on
// non-Node engines.
import matchGlob from 'picomatch/lib/picomatch.js'

export type * from '@openctx/protocol'
export type * from '@openctx/schema'
export type { Provider } from './provider'

export { createFilePositionCalculator, type PositionCalculator } from './helpers/position'

// For convenience, since many providers need globs.
export { matchGlob }
