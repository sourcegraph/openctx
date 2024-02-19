import type { FunctionComponent } from 'react'
import { ContentPage } from '../../src/content/ContentPage.tsx'
import { DocsLayout } from './components/DocsLayout.tsx'
import { content } from './content.ts'

export const Page: FunctionComponent = () => (
    <DocsLayout>
        <ContentPage content={content} />
    </DocsLayout>
)
