import compression from 'compression'
import express from 'express'
import sirv from 'sirv'
import { renderPage } from 'vike/server'
import { createServer as viteCreateServer } from 'vite'
import { root } from './root.js'

await startServer()

async function startServer(): Promise<void> {
    const app = express()

    app.use(compression())

    if (process.env.NODE_ENV === 'production') {
        app.use(sirv(`${root}/dist/client`))
    } else {
        const viteDevMiddleware = (
            await viteCreateServer({
                root,
                server: { middlewareMode: true },
            })
        ).middlewares
        app.use(viteDevMiddleware)
    }

    // Vike middleware (should always be last).
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    app.get('*', async (req, res, next) => {
        const pageContextInit = {
            urlOriginal: req.originalUrl,
        }
        const pageContext = await renderPage(pageContextInit)
        const { httpResponse } = pageContext
        if (!httpResponse) {
            return next()
        }
        const { body, statusCode, headers, earlyHints } = httpResponse
        if (res.writeEarlyHints) {
            res.writeEarlyHints({ link: earlyHints.map(e => e.earlyHintLink) })
        }
        headers.forEach(([name, value]) => res.setHeader(name, value))
        res.status(statusCode)
        res.send(body)
    })

    const port = process.env.PORT || 5801
    app.listen(port)
    console.error(`Server running at http://localhost:${port}`)
}
