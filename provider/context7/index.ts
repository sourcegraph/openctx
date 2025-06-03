import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaParams,
    MetaResult,
    Provider,
} from '@openctx/provider'
import { fetchLibraryDocumentation, searchLibraries } from './api.js'
import { filterLibrariesByPageNumbers, generateNavigation, parseInputQuery, validateSettings } from './core.js'
import type { Context7MentionData, SearchResult, Settings } from './types.js'
import { DEFAULT_SETTINGS, SETTINGS_LIMITS } from './types.js'

const CONTEXT7_BASE_URL = 'https://context7.com'

const Context7Provider: Provider<Settings> = {
    meta(_params: MetaParams, _settings: Settings): MetaResult {
        return {
            name: 'Context7',
            mentions: { label: 'type <library query> [page numbers] [topic]' },
        }
    },

    async mentions(params: MentionsParams, settings: Settings): Promise<MentionsResult> {
        validateSettings(settings)

        if (!params.query || params.query.trim().length === 0) {
            return []
        }

        try {
            const { repositoryQuery, topicKeyword, pageNumbers } = parseInputQuery(params.query)

            // Search for libraries
            const response = await searchLibraries(repositoryQuery)
            if (!response || response.results.length === 0) {
                return [{
                    title: `No results found`,
                    uri: '',
                    description: `No libraries found for "${repositoryQuery}"`,
                    data: {
                        isError: true,
                        content: `No libraries found for "${repositoryQuery}". Please check your search query.`
                    } as Context7MentionData
                }]
            }

            const mentionLimit = typeof settings.mentionLimit === 'number'
                ? Math.min(Math.max(settings.mentionLimit, 1), SETTINGS_LIMITS.mentionLimit.max)
                : DEFAULT_SETTINGS.mentionLimit

            // Use API results as-is (no additional sorting needed)
            const libraries: SearchResult[] = response.results

            // Handle page numbers
            if (pageNumbers) {
                const selectedLibraries = filterLibrariesByPageNumbers(libraries, pageNumbers)
                // Apply mention limit after filtering by page numbers
                const limitedLibraries = selectedLibraries.slice(0, mentionLimit)

                return limitedLibraries.map(lib => ({
                    title: `${lib.title} [${lib.totalTokens.toLocaleString()}]`,
                    uri: `${CONTEXT7_BASE_URL}/${lib.id}`,
                    description: lib.description || 'No description',
                    data: {
                        id: lib.id,
                        topicKeyword,
                        isNavigation: false,
                    } as Context7MentionData
                }))
            }

            // If no page numbers, return navigation
            // Generate navigation with all libraries (no limit applied)
            const navigationContent = generateNavigation(libraries, repositoryQuery, mentionLimit)
            return [{
                title: `Context7 Navigation: ${repositoryQuery}`,
                uri: `${CONTEXT7_BASE_URL}/search?q=${encodeURIComponent(repositoryQuery)}`,
                description: `${libraries.length} libraries found`,
                data: {
                    content: navigationContent,
                    isNavigation: true,
                    libraries: libraries, // Store all libraries, not limited
                    topicKeyword,
                } as Context7MentionData
            }]
        } catch (error) {
            return [{
                title: 'Error',
                uri: '',
                description: error instanceof Error ? error.message : 'Unknown error',
                data: {
                    isError: true,
                    content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                } as Context7MentionData
            }]
        }
    },

    async items(params: ItemsParams, settings: Settings): Promise<ItemsResult> {
        validateSettings(settings)

        const mentionData = params.mention?.data as Context7MentionData | undefined
        if (!mentionData) {
            return []
        }

        // Handle error items
        if (mentionData.isError) {
            return [{
                title: params.mention?.title || 'Error',
                ui: { hover: { text: 'Error occurred' } },
                ai: { content: mentionData.content || 'An error occurred' }
            }]
        }

        // Handle navigation items
        if (mentionData.isNavigation) {
            return [{
                title: params.mention?.title || 'Context7 Navigation',
                url: params.mention?.uri,
                ui: { hover: { text: 'Library navigation' } },
                ai: { content: mentionData.content || '' }
            }]
        }

        // Handle regular library items
        if (mentionData.id) {
            const response = await fetchLibraryDocumentation(mentionData.id, settings.tokens, {
                topic: mentionData.topicKeyword,
            })

            if (!response) {
                return [{
                    title: `Failed to fetch documentation`,
                    ui: { hover: { text: 'Failed to fetch' } },
                    ai: { content: `Failed to fetch documentation for ${mentionData.id}` }
                }]
            }

            const topicPart = mentionData.topicKeyword ? ` / topic: ${mentionData.topicKeyword}` : ''
            return [{
                title: `Context7: ${mentionData.id}${topicPart}`,
                url: `${CONTEXT7_BASE_URL}/${mentionData.id}/llms.txt?topic=${mentionData.topicKeyword || ''}&tokens=${settings.tokens}`,
                ui: { hover: { text: `${mentionData.id}${mentionData.topicKeyword ? `#${mentionData.topicKeyword}` : ''}` } },
                ai: { content: response },
            }]
        }

        return []
    },
}

export default Context7Provider
