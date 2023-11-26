import favicon from '/logomark-v0.svg'
import vikeReact from 'vike-react'
import type { Config } from 'vike/types'
import { Head } from '../src/layout/Head.tsx'
import { Layout } from '../src/layout/Layout.tsx'

const config: Config = {
    extends: vikeReact,

    passToClient: ['routeParams', 'layoutClassName', 'contentPageInfo', 'contentPageHtml', 'contentPageInfos'],
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
    description: 'Annotate code with info from other dev tools, in your editor and anywhere else you view code.',
    favicon,
}

export default config
