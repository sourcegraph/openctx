import { redirect } from 'vike/abort'
import type { OnBeforeRenderAsync } from 'vike/types'
import { createOnBeforeRender, slugFromPageContext } from '../../src/content/contentPages.tsx'
import { content } from './content.ts'

const onBeforeRenderContent = createOnBeforeRender(content)

export const onBeforeRender: OnBeforeRenderAsync = async (
    pageContext,
): ReturnType<OnBeforeRenderAsync> => {
    const slug = slugFromPageContext(pageContext)
    if (slug === 'index') {
        throw redirect('/docs/start')
    }
    return onBeforeRenderContent(pageContext)
}
