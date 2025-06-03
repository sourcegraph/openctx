export interface SearchResult {
    id: string
    title: string
    description?: string
    branch: string
    lastUpdate: string
    state: DocumentState
    totalTokens: number
    totalSnippets: number
    totalPages: number
    stars: number
    trustScore: number
}

export interface SearchResponse {
    results: SearchResult[]
}

// Version state is still needed for validating search results
export type DocumentState =
    | 'initial'
    | 'parsed'
    | 'finalized'
    | 'invalid_docs'
    | 'error'
    | 'stop'
    | 'delete'

export interface JsonDocs {
    codeTitle: string
    codeDescription: string
    codeLanguage: string
    codeTokens: number
    codeId: string
    pageTitle: string
    codeList: Array<{
        language: string
        code: string
    }>
    relevance: number
}

export interface ParsedQuery {
    repositoryQuery: string
    topicKeyword?: string
    pageNumbers?: number[]
}

export interface Context7MentionData {
    content?: string
    id?: string
    isNavigation?: boolean
    isError?: boolean
    libraries?: SearchResult[]
    topicKeyword?: string
    [k: string]: unknown
}

export interface Settings {
    tokens: number
    mentionLimit?: number
}

export const DEFAULT_SETTINGS = {
    mentionLimit: 5,
} as const

export const SETTINGS_LIMITS = {
    mentionLimit: { min: 1, max: 20 },
} as const

export const PATTERNS = {
    PAGE_NUMBERS: /^\d+(?:\/\d+)*$/,
} as const
