import type { ContentPages } from '../../src/content/contentPages.tsx'

export const content: ContentPages = {
    routePath: '/docs',
    fsPath: '../../content/docs',
    listContentPagePaths: () =>
        Object.keys(import.meta.glob('../../content/docs/**/*.mdx', { query: '?url' })),
    importContentPages: () => import.meta.glob('../../content/docs/**/*.mdx'),
    importContentPage: slug => [
        import(`../../content/docs/${slug}.mdx`),
        import(`../../content/docs/clients/${slug.replace('clients/', '')}.mdx`),
        import(`../../content/docs/providers/${slug.replace('providers/', '')}.mdx`),
    ],
}
