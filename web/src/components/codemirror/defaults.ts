import { EditorView } from '@codemirror/view'
import { type SettingsEditor } from '@opencodegraph/web-playground'
import { ocgDarkTheme, ocgHighlightStyle } from './colorTheme.ts'

const makeChipTextSmaller = EditorView.theme({
    '.ocg-chip': {
        fontSize: '78%',
    },
})

export const DEFAULT_CODEMIRROR_PROPS: React.ComponentProps<typeof SettingsEditor>['codeMirrorProps'] = {
    extensions: [ocgHighlightStyle, makeChipTextSmaller],
    theme: ocgDarkTheme,
    style: { fontSize: '90%' },
}
