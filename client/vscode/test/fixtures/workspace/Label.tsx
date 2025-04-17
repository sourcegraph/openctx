import type { FunctionComponent } from 'react'
import { eventLogger } from './eventLogger.js'

export const Label: FunctionComponent<{ title: string; htmlFor?: string }> = ({ title, htmlFor }) => {
    eventLogger.log('Label', { title })
    return <label htmlFor={htmlFor}>{title}</label>
}
