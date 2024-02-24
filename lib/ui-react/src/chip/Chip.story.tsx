import type { Item } from '@openctx/schema'
import type { Meta, StoryObj } from '@storybook/react'
import { Chip } from './Chip'

const FIXTURE_ITEM: Item = {
    title: '📘 Docs: CSS in client/web',
}

const meta: Meta<typeof Chip> = {
    title: 'Chip',
    component: Chip,
    decorators: [
        story => (
            <div style={{ maxWidth: '600px', margin: '2rem auto', border: 'solid 1px #ccc' }}>
                {story()}
            </div>
        ),
    ],
}

export default meta

type Story = StoryObj<typeof Chip>

export const Text: Story = {
    args: {
        item: { ...FIXTURE_ITEM } satisfies Item,
    },
}

export const Link: Story = {
    args: {
        item: { ...FIXTURE_ITEM, url: 'https://example.com' } satisfies Item,
    },
}

export const Detail: Story = {
    args: {
        item: { ...FIXTURE_ITEM, ui: { hover: { text: 'View doc page' } } } satisfies Item,
    },
}

export const Markdown: Story = {
    args: {
        item: {
            ...FIXTURE_ITEM,
            ui: { hover: { markdown: 'Status: **active**', text: 'Status: active' } },
        } satisfies Item,
    },
}

export const Image: Story = {
    args: {
        item: {
            ...FIXTURE_ITEM,
            ui: {
                hover: {
                    markdown:
                        '<img src="https://lh3.googleusercontent.com/d_S5gxu_S1P6NR1gXeMthZeBzkrQMHdI5uvXrpn3nfJuXpCjlqhLQKH_hbOxTHxFhp5WugVOEcl4WDrv9rmKBDOMExhKU5KmmLFQVg" alt="Google logo" width=512 height=300 />',
                },
            },
        } satisfies Item,
    },
}
