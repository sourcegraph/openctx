import { defaultKeymap } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { EditorState, type Extension } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { type ClientConfiguration, createClient } from '@openctx/client'
import providerHelloWorldUrl from '@openctx/provider-hello-world?url'
import { openCtxData, showOpenCtxDecorations } from '../src/index.js'

const container = document.createElement('div')
container.id = 'container'
container.style.width = '100%'
container.style.height = '100%'
document.body.append(container)

const client = createClient({
    configuration: () =>
        Promise.resolve({
            enable: true,
            providers: {
                [new URL(providerHelloWorldUrl, window.origin).toString()]: true,
            },
        } satisfies ClientConfiguration),
    makeRange: r => r,
    logger: console.error,
})

const CONTENT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    .map(n => `console.log("Hello, world #${n}");`)
    .join('\n')

const anns = await client.annotations({ uri: 'file:///foo.js', content: CONTENT })

const octxExtension: Extension = [
    openCtxData(anns),
    showOpenCtxDecorations({
        visibility: true,
        createDecoration(container, { anns }) {
            const div = document.createElement('div')
            div.style.display = 'flex'
            div.style.gap = '1rem'

            for (const { item } of anns) {
                const el = document.createElement(item.url ? 'a' : 'span')
                el.innerText = item.title
                el.title = item.ui?.hover?.text ?? ''
                if (item.url && el instanceof HTMLAnchorElement) {
                    el.href = item.url
                    el.style.textDecoration = 'none'
                    el.style.fontFamily = 'system-ui, sans-serif'
                    el.style.backgroundColor = '#ffffff22'
                    el.style.padding = '2px 4px'
                }
                div.append(el)
            }
            container.append(div)
            return {
                destroy() {
                    div.remove()
                },
            }
        },
    }),
]

const startState = EditorState.create({
    doc: CONTENT,
    extensions: [
        keymap.of(defaultKeymap),
        octxExtension,
        javascript(),
        EditorView.baseTheme({ '&': { fontSize: '140%' } }),
    ],
})

new EditorView({
    state: startState,
    parent: container,
})
