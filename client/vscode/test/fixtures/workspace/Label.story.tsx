import type { Meta, StoryObj } from '@storybook/react'
import { Label } from './Label.js'

const meta: Meta<typeof Label> = {
    title: 'Label',
    component: Label,
    decorators: [
        story => (
            <div style={{ maxWidth: '600px', margin: '2rem auto', border: 'solid 1px #ccc' }}>
                {story()}
            </div>
        ),
    ],
}

export default meta

type Story = StoryObj<typeof Label>

export const Text: Story = {
    args: { title: 'Hello, world!' },
}
