import type { Annotation } from '@openctx/schema'
import type { Meta, StoryObj } from '@storybook/html'
import { createChipList } from './ChipList'

const FIXTURE_ANNS: Annotation[] = [
    {
        uri: 'file:///f',
        item: { title: '📘 Docs: CSS in client/web' },
    },
    {
        uri: 'file:///f',
        item: { title: '📟 http_request_queue (metric)' },
    },
]

const meta: Meta = {
    title: 'ChipList',
    decorators: [
        story => {
            const container = document.createElement('div')
            container.style.maxWidth = '600px'
            container.style.margin = '2rem auto'
            container.style.border = 'solid 1px #ccc'
            container.append(story())
            return container
        },
    ],
}

export default meta

export const SingleChip: StoryObj = {
    render: () =>
        createChipList({
            annotations: FIXTURE_ANNS.slice(0, 1),
        }),
}

export const MultipleChips: StoryObj = {
    render: () =>
        createChipList({
            annotations: FIXTURE_ANNS,
        }),
}
