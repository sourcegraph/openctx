import type { OnBeforePrerenderStartSync } from 'vike/types'
import { createOnBeforePrerenderStart } from '../../src/content/contentPages.tsx'
import { content } from './content.ts'

export const onBeforePrerenderStart: OnBeforePrerenderStartSync = createOnBeforePrerenderStart(content)
