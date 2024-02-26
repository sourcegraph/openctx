import type { Item } from '@openctx/schema'
import type { Meta, StoryObj } from '@storybook/react'
import { ChipList } from './ChipList'

const FIXTURE_ITEMS: Item[] = [
    {
        title: '📘 Docs: CSS in client/web',
    },
    {
        title: '📟 http_request_queue (metric)',
    },
]

const meta: Meta<typeof ChipList> = {
    title: 'ChipList',
    component: ChipList,
    decorators: [
        story => (
            <div style={{ maxWidth: '600px', margin: '2rem auto', border: 'solid 1px #ccc' }}>
                {story()}
            </div>
        ),
    ],
}

export default meta

type Story = StoryObj<typeof ChipList>

export const SingleChip: Story = {
    args: {
        items: FIXTURE_ITEMS.slice(0, 1) satisfies Item[],
    },
}

export const MultipleChips: Story = {
    args: {
        items: FIXTURE_ITEMS satisfies Item[],
    },
}
