import type { ReactNode } from 'react'
import { usePageContext } from 'vike-react/usePageContext'
import firaCodeFontUrl from '/FiraCode.woff2'
import interItalicFontUrl from '/Inter-italic.var.woff2'
import interRomanFontUrl from '/Inter-roman.var.woff2'
import icoIconUrl from '/favicon.ico'
import svgIconUrl from '/logomark-v0.svg'

const CANONICAL_BASE_URL = new URL('https://openctx.org')

export const Head = (): ReactNode => {
    const { urlPathname } = usePageContext()
    return (
        <>
            <meta
                name="description"
                content="Annotate code with info from other dev tools, in your editor and anywhere else you view code."
            />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link rel="icon" type="image/svg+xml" href={svgIconUrl} />
            <link rel="icon" type="image/x-icon" href={icoIconUrl} />
            <link rel="preload" type="font/woff2" as="font" href={interRomanFontUrl} crossOrigin="" />
            <link rel="preload" type="font/woff2" as="font" href={interItalicFontUrl} crossOrigin="" />
            <link rel="preload" type="font/woff2" as="font" href={firaCodeFontUrl} crossOrigin="" />
            <link rel="canonical" href={new URL(urlPathname, CANONICAL_BASE_URL).toString()} />
        </>
    )
}
