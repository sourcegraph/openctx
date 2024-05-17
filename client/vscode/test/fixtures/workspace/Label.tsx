import type { FunctionComponent } from 'react'
import { eventLogger } from './eventLogger.js'

export const Label: FunctionComponent<{ title: string }> = ({ title }) => {
    eventLogger.log('Label', { title })
    return <label>{title}</label>
}
