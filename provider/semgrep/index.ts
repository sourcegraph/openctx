import type {
    Annotation,
    AnnotationsParams,
    AnnotationsResult,
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaParams,
    MetaResult,
    Provider,
} from '@openctx/provider'

export type Settings = {
    organization: string,   // Organization slug
    project: string,        // Project slug
    token: string           // Semgrep app token
}


const semgrep: Provider = {
    meta(params: MetaParams, settings: Settings): MetaResult {
        return {
            selector: [],
            name: 'Semgrep',
            features: { mentions: true },
        }
    },

    items(params: ItemsParams, settings: Settings): ItemsResult {
        return [] // TODO
    },

    mentions(params: MentionsParams, settings: Settings): MentionsResult {
        return [] // TODO
    },

    annotations(params: AnnotationsParams, settings: Settings): AnnotationsResult {
        const anns: Annotation[] = []
        // TODO
        return anns
    },
}

export default semgrep
