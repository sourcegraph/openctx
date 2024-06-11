import type {
    Item,
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaResult,
    Provider,
} from '@openctx/provider'
import { type SimpleWorkItem, fetchWorkItem, searchWorkItems } from './api.js'

export type Settings = {
    url: string
    accessToken: string
}

const checkSettings = (settings: Settings) => {
    const missingKeys = ['url', 'accessToken'].filter(key => !(key in settings))
    if (missingKeys.length > 0) {
        throw new Error(`Missing settings: ${JSON.stringify(missingKeys)}`)
    }
}

const wiToItem = (workItem: SimpleWorkItem): Item => ({
    url: workItem.url,
    title: workItem.fields.title,
    ui: {
        hover: {
            markdown: workItem.fields.description,
            text: workItem.fields.description || workItem.fields.title,
        },
    },
    ai: {
        content:
            `The following represents contents of the Azure DevOps WorkItem ${workItem.id}: ` +
            JSON.stringify({
                workItem: {
                    id: workItem.id,
                    state: workItem.fields.state,
                    assignedTo: workItem.fields.assignedTo,
                    type: workItem.fields.type,
                    url: workItem.url,
                    description: workItem.fields.description,
                    tags: workItem.fields.tags,
                },
            }),
    },
})

const azureDevOps: Provider = {
    meta(): MetaResult {
        return { name: 'Azure DevOps Work Items', mentions: {} }
    },

    async mentions(params: MentionsParams, settings: Settings): Promise<MentionsResult> {
        checkSettings(settings)

        // Uses the quick REST picker API to fuzzy match potential items
        return searchWorkItems(params.query, settings).then(items =>
            items.map(item => ({
                title: item.title,
                uri: item.url,
                description: item.description,
                data: { id: item.id },
            }))
        )
    },

    async items(params: ItemsParams, settings: Settings): Promise<ItemsResult> {
        checkSettings(settings)

        const key = (params.mention?.data as { key: string }).key

        const workItem = await fetchWorkItem(key, settings)

        if (!workItem) {
            return []
        }

        const items = [wiToItem(workItem)]

        return items
    },
}

export default azureDevOps
