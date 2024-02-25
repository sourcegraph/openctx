import { MDXProvider } from '@mdx-js/react'
import { type ComponentType, useEffect, useState } from 'react'
import { renderToString } from 'react-dom/server'
import { render } from 'vike/abort'
import type { OnBeforePrerenderStartSync, OnBeforeRenderAsync, PageContext } from 'vike/types'
import type { PageContextForTitle } from '../../renderer/+title.ts'
import { MDX_COMPONENTS } from '../components/content/MdxComponents.tsx'

export interface ConfigForContentPages {
    title: (pageContext: PageContext) => string
}

export interface ContentPageInfo {
    title: string
    group: string
    order?: number
    slug: string
}

export interface PageContextForContentPage {
    contentPageInfo: ContentPageInfo

    /**
     * Available in {@link PageContext} on server pre-rendered pages and on non-initial client page
     * loads.
     */
    contentPageComponent?: ComponentType

    /** Used on initial client page loads. */
    contentPageHtml?: TrustedHTML
}

export interface ContentPages {
    /** @example "/docs" */
    routePath: string

    /** @example ../../content/docs */
    fsPath: string

    /**
     * @example () => Object.keys(import.meta.glob('../../../content/docs/*.mdx', { query: '?url' }))
     */
    listContentPagePaths(): string[]

    /**
     * @example () => import.meta.glob('../../../content/docs/*.mdx')
     */
    importContentPages(): Record<string, () => Promise<unknown>>

    /**
     * If the content pages live in subdirectories, this function needs to try importing the slug in
     * each subdirectory (because Vite does not support import path interpolations with path
     * separators).
     *
     * @example (slug) => import(`../../../content/docs/${slug}.mdx`)
     */
    importContentPage(slug: string): Promise<unknown> | Promise<unknown>[]
}

export function createOnBeforePrerenderStart(content: ContentPages): OnBeforePrerenderStartSync {
    return () =>
        content
            .listContentPagePaths()
            .map(path => contentPagePathToSlug(path, content.fsPath))
            .sort()
            .map(slug => `${content.routePath}/${slug}`)
}

export function createOnBeforeRender(content: ContentPages): OnBeforeRenderAsync {
    return async (pageContext: PageContext): ReturnType<OnBeforeRenderAsync> => {
        const slug = slugFromPageContext(pageContext)
        const { MDXContent, info } = await getContentPage(content, slug)

        const infos = await getAllContentPageInfos(content)

        return {
            pageContext: {
                contentPageInfo: { ...info, slug },
                contentPageComponent: MDXContent,
                contentPageHtml:
                    typeof window === 'undefined'
                        ? renderToString(
                              <MDXProvider components={MDX_COMPONENTS}>
                                  <MDXContent />
                              </MDXProvider>
                          )
                        : undefined,
                contentPageInfos: infos,
                pageTitle: info?.title,
            } satisfies PageContextForContentPage & PageContextForContentPageIndex & PageContextForTitle,
        }
    }
}

function contentPagePathToSlug(path: string, base: string): string {
    return path.slice(base.length + 1).replace(/\.mdx$/, '')
}

interface ContentPage {
    MDXContent: ComponentType
    info: ContentPageInfo
}

export interface PageContextForContentPageIndex {
    contentPageInfos: ContentPageInfo[]
}

async function getAllContentPageInfos(content: ContentPages): Promise<ContentPageInfo[]> {
    // TODO(sqs): this causes all .mdx files to be parsed, can make Vite dev slow
    const mdxFiles = content.importContentPages()
    return Promise.all(
        Object.entries(mdxFiles).map(([path, load]) =>
            load().then(mdxModule => ({
                slug: contentPagePathToSlug(path, content.fsPath),
                ...(mdxModule as { info: Omit<ContentPageInfo, 'slug'> }).info,
            }))
        )
    )
}

async function getContentPage(content: ContentPages, slug: string): Promise<ContentPage> {
    let result = content.importContentPage(slug)
    if (Array.isArray(result)) {
        const allResults = await Promise.allSettled(result)

        const unexpectedErrors = allResults
            .filter(
                (res): res is PromiseRejectedResult =>
                    res.status === 'rejected' &&
                    !String(res.reason).includes('Unknown variable dynamic import')
            )
            .map(res => res.reason)
        if (unexpectedErrors.length > 0) {
            throw new Error(
                `unexpected errors in getContentPage(${slug}): ${unexpectedErrors.join(', ')}`
            )
        }

        const fulfilledResult = allResults.find(
            (value): value is PromiseFulfilledResult<unknown> => value.status === 'fulfilled'
        )
        if (!fulfilledResult) {
            throw render(404)
        }
        result = Promise.resolve(fulfilledResult.value)
    }
    const mdxModule = (await result) as {
        default: ContentPage['MDXContent']
        info: ContentPage['info']
    }
    return { MDXContent: mdxModule.default, info: mdxModule.info }
}

export function slugFromPageContext(pageContext: PageContext): string {
    const slug = pageContext.routeParams?.['*']
    if (slug === undefined) {
        throw new Error('no slug')
    }
    return slug === '' ? 'index' : slug
}

export function useContentPageComponent(
    content: ContentPages,
    pageContext: PageContext & PageContextForContentPage
): ComponentType | undefined {
    const slug = slugFromPageContext(pageContext)

    const [component, setComponent] = useState<ComponentType | undefined>(() =>
        // Server page render.
        'contentPageComponent' in pageContext ? pageContext.contentPageComponent : undefined
    )
    useEffect(() => {
        if ('contentPageComponent' in pageContext) {
            // Non-initial client page render.
            setComponent(() => pageContext.contentPageComponent)
        } else {
            // Initial client page render.
            setComponent(undefined)
            getContentPage(content, slug)
                .then(contentPage => {
                    setComponent(() => contentPage.MDXContent)
                })
                .catch(console.error)
        }
    }, [content, pageContext, slug])

    return component
}
