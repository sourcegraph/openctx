import {
    type AnnotationsParams,
    type AnnotationsResult,
    type CapabilitiesParams,
    type CapabilitiesResult,
    type ItemImage,
    type Provider,
    type Range,
} from '@opencodegraph/provider'

// Keep in sync with README.md
/** Settings for the `storybook` OpenCodeGraph provider. */
export interface Settings {
    /**
     * The URL to a published Storybook for your project.
     *
     * If you're using Chromatic, this is of the form `https://<branch>--<appid>.chromatic.com`; see
     * https://www.chromatic.com/docs/permalinks/#get-permalinks-to-your-project for how to obtain
     * this value.
     *
     * If the URL contains `<branch>`, it will always be replaced with `main`.
     *
     * TODO(sqs): Support non-main branches.
     */
    storybookUrl: string
}

/**
 * An [OpenCodeGraph](https://opencodegraph.org) provider that annotates code files with links and
 * image previews from [Storybook](https://storybook.js.org/), so you can see what your UI
 * components look like.
 */
const storybook: Provider<Settings> = {
    capabilities(_params: CapabilitiesParams, settings: Settings): CapabilitiesResult {
        if (!settings.storybookUrl) {
            return {}
        }
        return { selector: [{ path: '**/*.story.(t|j)s?(x)' }, { path: '**/*.(t|j)s(x)', contentContains: 'react' }] }
    },

    async annotations(params: AnnotationsParams, settings: Settings): Promise<AnnotationsResult> {
        const anns: AnnotationsResult = []

        if (!settings.storybookUrl) {
            return anns
        }

        const contentLines = params.content.split(/\r?\n/)
        const fileKind = basename(params.file).includes('.story.') ? 'story-file' : 'component-file'

        if (fileKind === 'story-file') {
            // Story file.
            const component = getStoryTitle(params.content)
            if (component) {
                // Incorrectly warns about `/d`.
                // eslint-disable-next-line unicorn/better-regex
                const { matches, ranges } = firstSubmatchMatches(/export const (\w+): Story/d, contentLines)
                for (const [i, story] of matches.entries()) {
                    const storyName = getStoryNameAlias(story, params.content)
                    const storyURL = chromaticStoryURL(component, storyName, settings)
                    anns.push({
                        item: {
                            title: `🖼️ Storybook: ${component}/${storyName}`,
                            url: storyURL,
                            image: await getImagePreview(storyURL),
                        },
                        range: ranges[i],
                    })
                }
            }
        } else {
            // Component file.
            const { matches, ranges } = firstSubmatchMatches(
                // Incorrectly warns about `/d`.
                // eslint-disable-next-line unicorn/better-regex
                /export const ([A-Z]\w+): (?:(?:React\.)?FC|FunctionComponent|Component|SFC)\b/d,
                contentLines
            )
            for (const [i, component] of matches.entries()) {
                const storyTitle = getStoryComponentTitleForReactComponent(params.file, component)
                if (storyTitle) {
                    const story = 'Default'
                    const storyURL = chromaticStoryURL(storyTitle, story, settings)
                    anns.push({
                        item: {
                            title: `🖼️ Storybook: ${storyTitle}`,
                            url: storyURL,
                            image: await getImagePreview(storyURL),
                        },
                        range: ranges[i],
                    })
                }
            }
        }

        return anns
    },
}

export default storybook

function firstSubmatchMatches(pattern: RegExp, lines: string[]): { matches: string[]; ranges: Range[] } {
    const matches: string[] = []
    const ranges: Range[] = []
    for (const [i, line] of lines.entries()) {
        const match = line.match(pattern)
        if (match) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const [start, end] = match.indices![1]
            matches.push(match[1])
            ranges.push({
                start: { line: i, character: start },
                end: { line: i, character: end },
            })
        }
    }
    return { matches, ranges }
}

function getStoryTitle(content: string): string {
    const match = content.match(/title: '([^']+)'/)
    return match ? match[1] : ''
}

function getStoryNameAlias(story: string, content: string): string {
    // Look for `PlainRequest.storyName = 'plain request'` or similar.
    const storyNameAlias = new RegExp(story + "\\.storyName = '(\\w+)'")
    const match = content.match(storyNameAlias)
    if (match) {
        return match[1]
    }
    return story
}

function getStoryComponentTitleForReactComponent(path: string, reactComponentName: string): string {
    // TODO(sqs): un-hardcode for sourcegraph
    const map: { [key: string]: string } = {
        SignInPage: 'web/auth/SignInPage',
    }
    return map[reactComponentName]
}

function chromaticStorySlug(component: string, story: string): string {
    return component.replaceAll('/', '-').toLowerCase() + '--' + kebabCase(story)
}

function rootStorybookURL(settings: Settings): URL {
    const urlStr = settings.storybookUrl.replace('<branch>', 'main') // TODO(sqs): support other branches
    return new URL(urlStr)
}

function chromaticStoryURL(component: string, story: string, settings: Settings): string {
    const url = rootStorybookURL(settings)
    url.searchParams.set('path', `/story/${chromaticStorySlug(component, story)}`)
    return url.toString()
}

async function getImagePreview(storyUrlStr: string): Promise<ItemImage | undefined> {
    const storyUrl = new URL(storyUrlStr)
    if (!storyUrl.hostname.endsWith('.chromatic.com')) {
        return undefined // only oEmbed for Chromatic is supported
    }

    // Example of working oEmbed URL:
    // https://www.chromatic.com/oembed?url=https://5f0f381c0e50750022dc6bf7-qjtkjsausw.chromatic.com/?path=/story/web-auth-postsignuppage--unverified-email&format=json

    // TODO(sqs): Need a way to map back to the <appId>-<buildId> format, which is the only thing
    // that Chromatic's oEmbed endpoint supports. See
    // https://twitter.com/sqs/status/1732901714372796523. Hardcode this for now.
    if (!__test__.skipRewriteForOEmbed) {
        const sourcegraphAppId = '5f0f381c0e50750022dc6bf7' // this is public because our storybooks are public
        if (!storyUrl.hostname.endsWith(`--${sourcegraphAppId}.chromatic.com`)) {
            return undefined
        }
        storyUrl.hostname = `${sourcegraphAppId}-qjtkjsausw.chromatic.com`
    }

    const oembedUrl = new URL('https://www.chromatic.com/oembed')
    oembedUrl.searchParams.set('url', storyUrl.toString())
    oembedUrl.searchParams.set('format', 'json')

    const resp = await fetch(oembedUrl.toString())
    if (!resp.ok) {
        logError(`Chromatic oembed endpoint returned ${resp.status}`)
        return undefined
    }

    interface OEmbedData {
        title: string
        thumbnail_url?: string
        thumbnail_width?: number
        thumbnail_height?: number
        html?: string
    }

    const oembedData = (await resp.json()) as OEmbedData
    if (oembedData.thumbnail_url) {
        return {
            url: oembedData.thumbnail_url,
            width: oembedData.thumbnail_width,
            height: oembedData.thumbnail_height,
            alt: oembedData.title,
        }
    }
    return undefined
}

/**
 * Convert from CamelCase to kebab-case.
 */
function kebabCase(text: string): string {
    return text.replaceAll(/([A-Z])/g, g => `-${g[0].toLowerCase()}`).replace(/^-/, '')
}

function basename(path: string): string {
    return path.slice(path.lastIndexOf('/') + 1)
}

/**
 * For testing only.
 *
 * @internal
 */
export const __test__ = { suppressConsoleLog: false, skipRewriteForOEmbed: false }

function logError(message: string): void {
    if (!__test__.suppressConsoleLog) {
        console.error(message)
    }
}
