import type { Settings } from './index.ts'

export interface SearchResults {
    subject: string
    tickets: Ticket[]
}

export interface SearchResponse {
    results: SearchResult[]
}

interface SearchResult {
    id: number
    subject: string
    created_at: string
}

export interface Ticket {
    id: number
    subject: string
    created_at: string
    comments: TicketComment[]
    summary?: string
    summaries: Summary[]
}

export interface Summary {
    id: number
    summary?: string
    subject: string
}

export interface TicketComment {
    id: number
    author_id: number
    plain_body: string
    created_at: string
}

export interface ChatCompletionRequest {
    messages: Array<{ role: string; content: string }>
    model: string
    max_tokens: number
    stream: boolean
}

export interface ChatCompletionResponse {
    message: string
    choices: Array<{
        message: {
            content: string
        }
    }>
}

const authHeaders = (settings: Settings) => ({
    Authorization: `Basic ${Buffer.from(`${settings.email}/token:${settings.apiToken}`).toString('base64')}`,
})

const sgTokenHeaders = (settings: Settings) => ({
    Authorization: `token ${settings.sgToken}`,
})

const buildUrl = (settings: Settings, path: string, searchParams: Record<string, string> = {}) => {
    const url = new URL(`https://${settings.subdomain}.zendesk.com/api/v2${path}`)
    url.search = new URLSearchParams(searchParams).toString()
    return url
}

/**
 * Searches Zendesk tickets based on a query string and returns matching tickets with their details.
 * @param query - The search query string to filter tickets
 * @param settings - Zendesk API settings including subdomain, email, and API token
 * @returns Promise resolving to SearchResults containing matched tickets and their subjects
 */

export const searchTickets = async (
    query: string | undefined,
    settings: Settings,
): Promise<SearchResults> => {
    const searchResponse = await fetch(
        buildUrl(settings, '/search.json', {
            // Add search parameters here
            query: `${query} order_by:created sort:desc` || '',
        }),
        {
            method: 'GET',
            headers: authHeaders(settings),
        }
    )
    if (!searchResponse.ok) {
        throw new Error(
            `Error searching Zendesk tickets (${searchResponse.status} ${searchResponse.statusText
            }): ${await searchResponse.text()}`,
        )
    }

    const result = (await searchResponse.json()) as SearchResponse

    const searchResults: SearchResults = {
        subject: '',
        tickets: []
    }

    for (const item of result.results) {
        searchResults.subject += `${item.id.toString()} ${item.subject}, `
        searchResults.tickets.push({
            id: item.id,
            subject: item.subject,
            created_at: item.created_at,
            comments: [],
            summaries: []
        })
        // This is to limit the number of tickets.
        if (searchResults.tickets.length === 5) {
            break
        }
    }
    return searchResults
}

/**
 * Fetches comments for a given Zendesk ticket
 * @param ticket - The ticket object to fetch comments for
 * @param settings - Zendesk API settings including subdomain, email, and API token
 * @returns Promise resolving to Ticket object with comments field populated
 */
export const fetchComments = async (ticket: Ticket, settings: Settings): Promise<Ticket> => {
    const commentsResponse = await fetch(
        buildUrl(settings, `/tickets/${ticket.id}/comments.json`),
        {
            method: 'GET',
            headers: authHeaders(settings),
        }
    )
    if (!commentsResponse.ok) {
        throw new Error(
            `Error fetching Zendesk ticket comments (${commentsResponse.status} ${commentsResponse.statusText
            }): ${await commentsResponse.text()}`
        )
    }

    const commentsJSON = (await commentsResponse.json() as { comments: TicketComment[] }).comments
    // Extract only necessary fields from comments
    const comments: TicketComment[] = commentsJSON.map(comment => ({
        id: comment.id,
        author_id: comment.author_id,
        plain_body: comment.plain_body,
        created_at: comment.created_at,
    }))

    return { ...ticket, comments }
}

/**
 * Fetches a chat completion from the Sourcegraph API to generate a summary for a Zendesk ticket
 * @param settings - Sourcegraph API settings
 * @param ticket - The ticket object to generate a summary for
 * @returns Promise resolving to Ticket object with summary field populated
 */
export const fetchChatCompletion = async (
    settings: Settings,
    ticket: Ticket
): Promise<Ticket> => {

    const formatComments = (comments: TicketComment[]): string => {
        return comments.map(comment => {
            return `Comment ID: ${comment.id}\nAuthor ID: ${comment.author_id}\nContent: ${comment.plain_body}\nCreated At: ${comment.created_at}\n`
        }).join('\n')
    }

    const ticketContent = `
        Ticket ID: ${ticket.id}
        Subject: ${ticket.subject || 'N/A'}
        Created At: ${ticket.created_at || 'N/A'}
        Comments: ${formatComments(ticket.comments)}
    `
    const requestData: ChatCompletionRequest = {
        messages: [
            {
                role: 'user',
                content: `${settings.prompt} ${ticketContent}`
            }
        ],
        model: `${settings.model}`,
        max_tokens: 1000,
        stream: false
    }

    const response = await fetch(`${settings.sgDomain}`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'cody-api v1',
            ...sgTokenHeaders(settings),
        },
        body: JSON.stringify(requestData),
    })

    if (!response.ok) {
        throw new Error(`Error fetching chat completion (${response.status} ${response.statusText}): ${await response.text()}`)
    }

    const summary = (await response.json() as ChatCompletionResponse).choices[0].message.content

    return { ...ticket, summary }
}


export const fetchSummary = async (ticket: Ticket, settings: Settings): Promise<Ticket> => {
    const ticketWithComments = await fetchComments(ticket, settings)
    const ticketWithSummary = await fetchChatCompletion(settings, ticketWithComments)
    // Return the ticket with the summary
    return ticketWithSummary
}