// Import from a subpackage because the main module calls `os.platform()`, which doesn't work on
// non-Node engines.
//
// eslint-disable-next-line import/extensions
import matchGlob from 'picomatch/lib/picomatch.js'

export type { Provider as Provider } from './provider'
export type * from '@openctx/schema'
export type * from '@openctx/protocol'

// For convenience, since many providers need globs.
export { matchGlob }
