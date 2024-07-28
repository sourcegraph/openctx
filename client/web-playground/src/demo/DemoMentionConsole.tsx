import type { ComponentProps, FunctionComponent } from 'react'
import { MentionConsole } from '../MentionConsole.js'

export const DemoMentionConsole: FunctionComponent<
    Omit<ComponentProps<typeof MentionConsole>, 'resourceUri' | 'value' | 'onChange' | 'headerChildren'>
> = ({ ...props }) => {
    return <MentionConsole {...props} />
}
