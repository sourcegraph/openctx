import vikeReact from 'vike-react/config'
import type { Config } from 'vike/types'
import { Head } from '../src/layout/Head.tsx'
import { Layout } from '../src/layout/Layout.tsx'
import favicon from '/logomark-v0.svg'

const config: Config = {
    extends: vikeReact,

    passToClient: [
        'routeParams',
        'layoutClassName',
        'contentPageInfo',
        'contentPageHtml',
        'contentPageInfos',
    ],
    prerender: true,
    meta: {
        onBeforeRender: {
            env: { server: true, client: true },
        },
        pageTitle: {
            env: { server: true, client: true },
        },
        layoutClassName: {
            env: { server: true, client: true },
        },
    },

    Layout,
    Head,
    favicon,
}

export default config
