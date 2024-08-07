import type { Settings } from './index.ts'

export interface TicketPickerItem {
    id: number
    subject: string
    url: string
}

export interface Ticket {
    id: number
    url: string
    subject: string
    description: string
    tags: string[]
    status: string
    priority: string
    created_at: string
    updated_at: string
    comments: TicketComment[]
}

export interface TicketComment {
    id: number
    type: string
    author_id: number
    body: string
    html_body: string
    plain_body: string
    public: boolean
    created_at: string
}

const authHeaders = (settings: Settings) => ({
    Authorization: `Basic ${Buffer.from(`${settings.email}/token:${settings.apiToken}`).toString('base64')}`,
})

const buildUrl = (settings: Settings, path: string, searchParams: Record<string, string> = {}) => {
    const url = new URL(`https://${settings.subdomain}.zendesk.com/api/v2${path}`)
    url.search = new URLSearchParams(searchParams).toString()
    return url
}

export const searchTickets = async (
    query: string | undefined,
    settings: Settings,
): Promise<TicketPickerItem[]> => {
    const searchResponse = await fetch(
        buildUrl(settings, '/search.json', {
            query: `type:ticket ${query || ''}`,
        }),
        {
            method: 'GET',
            headers: authHeaders(settings),
        },
    )
    if (!searchResponse.ok) {
        throw new Error(
            `Error searching Zendesk tickets (${searchResponse.status} ${
                searchResponse.statusText
            }): ${await searchResponse.text()}`,
        )
    }

    const searchJSON = (await searchResponse.json()) as {
        results: {
            id: number
            subject: string
            url: string
        }[]
    }

    return searchJSON.results.map(ticket => ({
        id: ticket.id,
        subject: ticket.subject,
        url: ticket.url,
    }))
}

export const fetchTicket = async (ticketId: number, settings: Settings): Promise<Ticket | null> => {
    const ticketResponse = await fetch(
        buildUrl(settings, `/tickets/${ticketId}.json`),
        {
            method: 'GET',
            headers: authHeaders(settings),
        }
    )
    if (!ticketResponse.ok) {
        throw new Error(
            `Error fetching Zendesk ticket (${ticketResponse.status} ${
                ticketResponse.statusText
            }): ${await ticketResponse.text()}`
        )
    }

    const responseJSON = (await ticketResponse.json()) as { ticket: Ticket }
    const ticket = responseJSON.ticket

    if (!ticket) {
        return null
    }

    // Fetch comments for the ticket
    const commentsResponse = await fetch(
        buildUrl(settings, `/tickets/${ticketId}/comments.json`),
        {
            method: 'GET',
            headers: authHeaders(settings),
        }
    )
    if (!commentsResponse.ok) {
        throw new Error(
            `Error fetching Zendesk ticket comments (${commentsResponse.status} ${
                commentsResponse.statusText
            }): ${await commentsResponse.text()}`
        )
    }

    const commentsJSON = (await commentsResponse.json()) as { comments: TicketComment[] }
    ticket.comments = commentsJSON.comments

    return ticket
}
