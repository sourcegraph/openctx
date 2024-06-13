import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaParams,
    MetaResult,
    Provider,
    ProviderSettings,
} from '@openctx/provider'

// https://swapi.dev/documentation#vehicles
type Vehicle = {
    name: string
    model: string
    manufacturer: string
    url: string
}

const provider: Provider = {
    meta(params: MetaParams, settings: ProviderSettings): MetaResult {
        return {
            name: 'JSON API Example',
            mentions: {},
        }
    },

    async mentions(params: MentionsParams, settings: ProviderSettings): Promise<MentionsResult> {
        const endpoint = 'https://swapi.dev/api/vehicles'
        const url = params.query ? `${endpoint}?search=${encodeURIComponent(params.query)}` : endpoint

        return fetch(url)
            .then(response => response.json() as Promise<{ results: Vehicle[] }>)
            .then(data => {
                return data.results.map(vehicle => ({
                    title: `${vehicle.name} (${vehicle.model})`,
                    description: vehicle.manufacturer,
                    uri: vehicle.url,
                    data: {
                        // Only minimal data should used here (e.g. an id or key)
                        id: vehicle.url.split('/').pop(),
                    },
                }))
            })
    },

    async items(params: ItemsParams, settings: ProviderSettings): Promise<ItemsResult> {
        // We just use the `mention.data`, but you can also make use of `params.message`
        const data = params.mention?.data as { id: string }

        const vehicle = await fetch(`https://swapi.dev/api/vehicles/${data.id}`).then(
            response => response.json() as Promise<Vehicle>
        )

        // We return one item, but you can return more to provide more context
        return [
            {
                title: vehicle.name,
                url: vehicle.url,
                ai: {
                    content: `Star wars vehicle named @${vehicle.name}: ${JSON.stringify(vehicle)}`,
                },
            },
        ]
    },
}

export default provider
