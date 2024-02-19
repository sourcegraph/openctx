import { redirect, render } from 'vike/abort'
import type { OnBeforeRenderSync } from 'vike/types'

// TODO(sqs): This needs to be defined in a way that static page hosts can use and return HTTP
// redirects, not just frontend redirects. See https://github.com/vikejs/vike/issues/1347. For now,
// it's also defined in netlify.toml.
export const onBeforeRender: OnBeforeRenderSync = pageContext => {
    const packageName = pageContext.routeParams['*']
    if (!packageName) {
        throw render(404, 'no package name specified')
    }

    if (!validPackageName(packageName)) {
        throw render(404, 'invalid package name')
    }

    throw redirect(`https://cdn.jsdelivr.net/npm/${packageName}/+esm`)
}

function validPackageName(packageName: string): boolean {
    return (
        /^(@[\w.-]{1,100}\/)?[\w.-]{1,100}$/.test(packageName) &&
        !packageName.includes('..') &&
        !packageName.includes('./') &&
        !packageName.includes('/.')
    )
}
