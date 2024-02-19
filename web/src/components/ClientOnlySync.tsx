import {
    useEffect,
    useState,
    type ComponentType,
    type FunctionComponent,
    type ReactElement,
} from 'react'

export const ClientOnlySync: FunctionComponent<{
    component: ComponentType
    initial: ReactElement
}> = ({ component, initial }) => {
    const [Component, setComponent] = useState<ComponentType>()

    useEffect(() => {
        setComponent(() => component)
    }, [component])

    return Component ? <Component /> : initial
}
