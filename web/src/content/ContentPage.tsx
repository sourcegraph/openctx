import { type FunctionComponent } from 'react'
import { usePageContext } from 'vike-react/usePageContext'
import { type PageContext } from 'vike/types'
import { useContentPageComponent, type ContentPages, type PageContextForContentPage } from './contentPages.tsx'

export const ContentPage: FunctionComponent<{ content: ContentPages }> = ({ content }) => {
    const pageContext = usePageContext() as PageContext & PageContextForContentPage

    const ContentPageComponent = useContentPageComponent(content, pageContext)

    return (
        <div>
            {ContentPageComponent ? (
                <div>
                    <ContentPageComponent />
                </div>
            ) : pageContext.contentPageHtml ? (
                <div dangerouslySetInnerHTML={{ __html: pageContext.contentPageHtml }} />
            ) : null}
        </div>
    )
}
