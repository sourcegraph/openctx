/* eslint-disable no-multiple-empty-lines */

import { type Selector } from '@opencodegraph/provider'


const languages = {
    c: ['.c', '.cxx'],
    cpp: ['.h', '.hpp', '.cpp', '.cxx'],
    dart: ['.dart'],
    elixir: ['.exs'],
    golang: ['.go'],
    haskell: ['.hs'],
    java: ['.java'],
    javascript: ['.js', '.jsx'],
    markdown: ['.md'],
    python: ['.py'],
    rust: ['.rs'],
    ruby: ['.rb'],
    swift: ['.swift'],
    typescript: ['.ts', '.tsx'],
}
const shortforms = {
    py: languages.python,
    js: languages.javascript,
    ts: languages.typescript,
}


export const filetype = function (platform: string): Selector {
    return { path: (languages[platform] ?? shortforms[platform]) || [] }
}
