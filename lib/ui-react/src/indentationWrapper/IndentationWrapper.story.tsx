import { type Meta, type StoryObj } from '@storybook/react'
import { type ReactNode } from 'react'
import { IndentationWrapper } from './IndentationWrapper'

const meta: Meta<typeof IndentationWrapper> = {
    title: 'IndentationWrapper',
    component: IndentationWrapper,
    decorators: [
        story => <div style={{ maxWidth: '600px', margin: '2rem auto', border: 'solid 1px #ccc' }}>{story()}</div>,
    ],
}

export default meta

const FIXTURE_CHILDREN: ReactNode[] = [
    <div key={0} style={{ backgroundColor: '#ccc' }}>
        foo bar
    </div>,
]

type Story = StoryObj<typeof IndentationWrapper>

export const NoIndent: Story = {
    args: {
        indent: undefined,
        children: FIXTURE_CHILDREN,
    },
}

export const Indented: Story = {
    args: {
        indent: '    ',
        children: FIXTURE_CHILDREN,
    },
}

export const ExtraMargin: Story = {
    args: {
        indent: '    ',
        extraMargin: 50,
        children: FIXTURE_CHILDREN,
    },
}
