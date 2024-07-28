import path from 'node:path'
import url from 'node:url'
import type { Item, Mention, MentionsParams } from '@openctx/provider'
import { describe, expect, test } from 'vitest'
import devdocs, { type Settings } from './index.js'

// We only run this if INTEGRATION is true to avoid flakiness.
const INTEGRATION = !!process.env.INTEGRATION

describe('devdocs', () => {
    const fixturesDir = path.join(__dirname, '__fixtures__')
    const fixturesSettings = {
        urls: [url.pathToFileURL(fixturesDir).toString()],
    }

    test('meta', () => {
        expect(devdocs.meta({}, {})).toEqual({
            name: 'DevDocs',
            mentions: { label: 'Search docs... (css, html, http, javascript, dom)' },
        })

        expect(
            devdocs.meta(
                {},
                {
                    urls: [
                        'https://devdocs.io/angular~16/',
                        'https://devdocs.io/css/',
                        'https://devdocs.io/typescript/',
                    ],
                },
            ),
        ).toEqual({
            name: 'DevDocs',
            mentions: { label: 'Search docs... (angular~16, css, typescript)' },
        })

        expect(devdocs.meta({}, { urls: ['https://devdocs.io/go/'] })).toEqual({
            name: 'DevDocs',
            mentions: { label: 'Search docs... (go)' },
        })
    })

    test('meta malformed', () => {
        expect(
            devdocs.meta(
                {},
                {
                    urls: [
                        'https://devdocs.io/go',
                        'https://github.com/sourcegraph/openctx/pull/152',
                        'hello world',
                        '',
                    ],
                },
            ),
        ).toEqual({
            name: 'DevDocs',
            mentions: { label: 'Search docs... (go, 152)' },
        })
    })

    test('empty query returns results', async () => {
        const settings = fixturesSettings

        const mentions = await devdocs.mentions!({ query: '' }, settings)
        expect(mentions).toBeInstanceOf(Array)
        expect(mentions).toBeTruthy()
    })

    test('test page type', async () => {
        const settings = fixturesSettings
        const mentionPath = path.join(fixturesDir, 'strconv', 'index')
        const item = await expectMentionItem({ query: 'strconv' }, settings, {
            title: 'strconv',
            uri: url.pathToFileURL(mentionPath).toString(),
        })
        expect(item.ai?.content).toContain(
            'Package strconv implements conversions to and from string representations of basic data types.',
        )
    })
    test.runIf(INTEGRATION)('integration test page type', async () => {
        const settings = {
            urls: ['https://devdocs.io/go/'],
        }

        const item = await expectMentionItem({ query: 'strconv' }, settings, {
            title: 'strconv',
            uri: 'https://devdocs.io/go/strconv/index',
        })
        expect(item.ai?.content).toContain(
            'Package strconv implements conversions to and from string representations of basic data types.',
        )
    })

    test('test hash type', async () => {
        const settings = fixturesSettings
        const mentionURL = url.pathToFileURL(path.join(fixturesDir, 'io', 'index'))
        mentionURL.hash = '#TeeReader'

        const item = await expectMentionItem({ query: 'teereader' }, settings, {
            title: 'io.TeeReader()',
            uri: mentionURL.toString(),
        })
        expect(item.ai?.content).toEqual(
            '<h3 id="TeeReader">func <span>TeeReader</span>  </h3><pre data-language="go">func TeeReader(r Reader, w Writer) Reader</pre><p>TeeReader returns a <a href="#Reader">Reader</a> that writes to w what it reads from r. All reads from r performed through it are matched with corresponding writes to w. There is no internal buffering - the write must complete before the read completes. Any error encountered while writing is reported as a read error. </p><h4 id="example_TeeReader"> <span class="text">Example</span>\n' +
                '</h4><p>Code:</p><pre class="code" data-language="go">var r io.Reader = strings.NewReader("some io.Reader stream to be read\\n")\n' +
                '\n' +
                'r = io.TeeReader(r, os.Stdout)\n' +
                '\n' +
                '// Everything read from r will be copied to stdout.\n' +
                'if _, err := io.ReadAll(r); err != nil {\n' +
                '    log.Fatal(err)\n' +
                '}\n' +
                '\n' +
                '</pre><p>Output:</p><pre class="output" data-language="go">some io.Reader stream to be read\n' +
                '</pre>',
        )
    })
    test.runIf(INTEGRATION)('integration test hash type', async () => {
        const settings = {
            urls: ['https://devdocs.io/go/'],
        }

        const item = await expectMentionItem({ query: 'teereader' }, settings, {
            title: 'io.TeeReader()',
            uri: 'https://devdocs.io/go/io/index#TeeReader',
        })
        expect(item.ai?.content).toEqual(
            '<h3 id="TeeReader">func <span>TeeReader</span>  </h3><pre data-language="go">func TeeReader(r Reader, w Writer) Reader</pre><p>TeeReader returns a <a href="#Reader">Reader</a> that writes to w what it reads from r. All reads from r performed through it are matched with corresponding writes to w. There is no internal buffering - the write must complete before the read completes. Any error encountered while writing is reported as a read error. </p><h4 id="example_TeeReader"> <span class="text">Example</span>\n' +
                '</h4><p>Code:</p><pre class="code" data-language="go">var r io.Reader = strings.NewReader("some io.Reader stream to be read\\n")\n' +
                '\n' +
                'r = io.TeeReader(r, os.Stdout)\n' +
                '\n' +
                '// Everything read from r will be copied to stdout.\n' +
                'if _, err := io.ReadAll(r); err != nil {\n' +
                '    log.Fatal(err)\n' +
                '}\n' +
                '\n' +
                '</pre><p>Output:</p><pre class="output" data-language="go">some io.Reader stream to be read\n' +
                '</pre>',
        )
    })

    test('missing documentation has no results', async () => {
        const settings = fixturesSettings
        const mentions = await devdocs.mentions!({ query: 'abortcontroller' }, settings)
        expect(mentions).toHaveLength(0)
    })

    test.runIf(INTEGRATION)('integration abortcontroller top in default urls', async () => {
        const settings = {}
        const want = {
            title: 'AbortController',
            uri: 'https://devdocs.io/dom/abortcontroller',
        }
        const mentions = await devdocs.mentions!({ query: 'abortcontroller' }, settings)
        expect(mentions).toContainEqual(want)
        expect(mentions[0]).toEqual(want)
    })
})

/**
 * Helper which expects a certain mention back and then passes it on to items
 */
async function expectMentionItem(
    params: MentionsParams,
    settings: Settings,
    mention: Mention,
): Promise<Item> {
    const mentions = await devdocs.mentions!(params, settings)
    expect(mentions).toContainEqual(mention)

    const items = await devdocs.items!({ mention }, settings)
    expect(items).toHaveLength(1)
    const item = items[0]

    expect(item.title).toEqual(mention.title)
    expect(item.url).toEqual(mention.uri)

    return item
}
