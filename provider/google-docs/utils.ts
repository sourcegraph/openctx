export function parseDocumentIDFromURL(urlStr: string): string | undefined {
    const url = new URL(urlStr)
    if (url.hostname !== 'docs.google.com') {
        return undefined
    }
    const match = url.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/)
    return match ? match[1] : undefined
}
