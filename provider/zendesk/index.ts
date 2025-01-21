import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaParams,
    MetaResult,
    Provider,
} from '@openctx/provider'
import { type Summary, Ticket, fetchSummary, searchTickets } from './api.js'

export type Settings = {
    subdomain: string
    email: string
    apiToken: string
    sgToken: string
    sgDomain: string
    prompt: string
    model: string
}

const checkSettings = (settings: Settings) => {
    const missingKeys = ['subdomain', 'email', 'apiToken', 'sgToken', 'sgDomain', 'prompt', 'model'].filter(key => !(key in settings))
    if (missingKeys.length > 0) {
        throw new Error(`Missing settings: ${JSON.stringify(missingKeys)}`)
    }
}

const zendeskProvider: Provider = {
    meta(params: MetaParams, settings: Settings): MetaResult {
        return { name: 'Zendesk', mentions: { label: 'Search by subject, id, or paste url...' } }
    },
    async mentions(params: MentionsParams, settings: Settings): Promise<MentionsResult> {
        if (!params.query) {
            return []
        }

        checkSettings(settings)

        const ticketResults = await searchTickets(params.query, settings)

        return [
            {
                title: ticketResults.subject,
                uri: '',
                description: ticketResults.subject,
                data: { tickets: ticketResults.tickets },
            },
        ]
    },

    async items(params: ItemsParams, settings: Settings): Promise<ItemsResult> {
        checkSettings(settings)

        const tickets = (params.mention?.data as { tickets: Ticket[] }).tickets
        const allSummaries: Summary[] = []

        const fetchSummaries = await Promise.all(
            tickets.map(ticket => fetchSummary(ticket, settings))
        )

        fetchSummaries.forEach(summary => {
            if (summary) {
                allSummaries.push({ id: summary.id, summary: summary.summary, subject: summary.subject })
            }
        })

        if (!allSummaries) {
            return []
        }

        console.log('allSummaries', allSummaries)

        return [{
            url: '',
            title: params.mention?.title || '',
            ui: {
                hover: {
                    markdown: '',
                    text: '',
                },
            },
            ai: {
                content:
                    `The following represents contents of the Zendesk tickets:` +
                    JSON.stringify({
                        ticket: {
                            summaries: allSummaries
                        },
                    }),
            },
        }]
    },
}

export default zendeskProvider
