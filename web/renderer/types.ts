import type {
    PageContextForContentPage,
    PageContextForContentPageIndex,
} from '../src/content/contentPages.tsx'
import type { PageContextForLayout } from '../src/layout/Layout.tsx'
import type { PageContextForTitle } from './+title.ts'

export type { PageContext, PageContextClient, PageContextServer } from 'vike/types'

declare global {
    namespace Vike {
        interface PageContext
            extends PageContextForTitle,
                PageContextForContentPage,
                PageContextForContentPageIndex {
            config: PageContextForLayout & PageContextForTitle
        }
        interface Config extends PageContextForLayout, PageContextForTitle {}
    }
}
