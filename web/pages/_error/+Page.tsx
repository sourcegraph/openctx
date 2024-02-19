import type { FunctionComponent } from 'react'

export const Page: FunctionComponent<{ is404: boolean }> = ({ is404 }) =>
    is404 ? (
        <>
            <h1>404 Page Not Found</h1>
            <p>This page could not be found.</p>
        </>
    ) : (
        <>
            <h1>500 Internal Error</h1>
            <p>Something went wrong.</p>
        </>
    )
