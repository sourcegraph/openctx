import type { ComponentProps, FunctionComponent } from 'react'
import { MentionsConsole } from '../MentionsConsole.js'

export const DemoMentionsConsole: FunctionComponent<
    Omit<ComponentProps<typeof MentionsConsole>, 'resourceUri' | 'value' | 'onChange' | 'headerChildren'>
> = ({ ...props }) => {
    return <MentionsConsole {...props} />
}
