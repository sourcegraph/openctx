import type {
    Item,
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaParams,
    MetaResult,
    Provider,
} from '@openctx/provider'
import { type Ticket, fetchTicket, searchTickets } from './api.js'

export type Settings = {
    subdomain: string
    email: string
    apiToken: string
}

const checkSettings = (settings: Settings) => {
    const missingKeys = ['subdomain', 'email', 'apiToken'].filter(key => !(key in settings))
    if (missingKeys.length > 0) {
        throw new Error(`Missing settings: ${JSON.stringify(missingKeys)}`)
    }
}

const ticketToItem = (ticket: Ticket): Item => ({
    url: ticket.url,
    title: ticket.subject,
    ui: {
        hover: {
            markdown: ticket.description,
            text: ticket.description || ticket.subject,
        },
    },
    ai: {
        content:
            `The following represents contents of the Zendesk ticket ${ticket.id}: ` +
            JSON.stringify({
                ticket: {
                    id: ticket.id,
                    subject: ticket.subject,
                    url: ticket.url,
                    description: ticket.description,
                    tags: ticket.tags,
                    status: ticket.status,
                    priority: ticket.priority,
                    created_at: ticket.created_at,
                    updated_at: ticket.updated_at,
                    comments: ticket.comments.map(comment => ({
                        id: comment.id,
                        type: comment.type,
                        author_id: comment.author_id,
                        body: comment.body,
                        html_body: comment.html_body,
                        plain_body: comment.plain_body,
                        public: comment.public,
                        created_at: comment.created_at,
                    }))
                },
            }),
    },
})

const zendeskProvider: Provider = {
    meta(params: MetaParams, settings: Settings): MetaResult {
        return { name: 'Zendesk', mentions: { label: 'Search by subject, id, or paste url...' } }
    },
    async mentions(params: MentionsParams, settings: Settings): Promise<MentionsResult> {
        checkSettings(settings)

        return searchTickets(params.query, settings).then(items =>
            items.map(item => ({
                title: `#${item.id}`,
                uri: item.url,
                description: item.subject,
                data: { id: item.id },
            })),
        )
    },

    async items(params: ItemsParams, settings: Settings): Promise<ItemsResult> {
        checkSettings(settings)

        const id = (params.mention?.data as { id: number }).id

        const ticket = await fetchTicket(id, settings)

        if (!ticket) {
            return []
        }

        return [ticketToItem(ticket)]
    },
}

export default zendeskProvider
