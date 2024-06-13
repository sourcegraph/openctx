import { usePageContext } from 'vike-react/usePageContext'

export function Page() {
    const pageContext = usePageContext()

    return pageContext.is404 ? (
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
}
