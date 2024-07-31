import type { ProviderSettings } from '@openctx/client'

async function getProviders(): Promise<Record<string, ProviderSettings | boolean>> {
    const providerSettings: Record<string, ProviderSettings | boolean> = {
        '../../../../provider/hello-world/index.ts': true,
        '../../../../provider/links/index.ts': {
            links: [
                {
                    title: 'Telemetry',
                    url: 'https://docs-legacy.sourcegraph.com/dev/background-information/telemetry#sourcegraph-web-app',
                    type: 'docs',
                    path: '**/*.ts?(x)',
                    pattern: 'eventLogger\\.',
                },
                {
                    title: 'CSS in client/web',
                    url: 'https://docs-legacy.sourcegraph.com/@3.39/dev/background-information/web/styling#styling-ui',
                    type: 'docs',
                    path: '**/*.ts?(x)',
                    pattern: '^import styles from',
                },
                {
                    title: 'Bazel at Sourcegraph',
                    url: 'https://docs.sourcegraph.com/dev/background-information/bazel#bazel-at-sourcegraph',
                    type: 'docs',
                    path: '**/{BUILD.bazel,*.bzl,*.bazelrc,WORKSPACE}',
                },
                {
                    title: 'View all Storybooks',
                    url: 'https://www.chromatic.com/library?appId=5f0f381c0e50750022dc6bf7',
                    description: 'On Chromatic',
                    path: '**/{*.{stories,story}.ts?(x),.storybook/**}',
                },
            ],
        } satisfies import('@openctx/provider-links').Settings,
        '../../../../provider/storybook/index.ts': {
            storybookUrl: 'https://<branch>--5f0f381c0e50750022dc6bf7.chromatic.com/',
        } satisfies import('@openctx/provider-storybook').Settings,
    }

    const providerModules = import.meta.glob<boolean, string, { default: string }>(
        '../../../../provider/*/index.ts',
        { query: '?url' },
    )
    for (const [path, urlModule] of Object.entries(providerModules)) {
        const providerUri = new URL((await urlModule()).default, import.meta.url).toString()
        const settings = providerSettings[path] ?? true
        delete providerSettings[path]
        providerSettings[providerUri] = settings
    }

    return providerSettings
}

export async function getDefaultSettings(): Promise<string> {
    const providers = await getProviders()
    return JSON.stringify({ 'openctx.providers': providers }, null, 2)
}
