import {
    type ComponentType,
    type FunctionComponent,
    type ReactNode,
    Suspense,
    lazy,
    useEffect,
    useState,
} from 'react'

export const ClientOnlyLazy: FunctionComponent<{
    component: () => Promise<{ default: ComponentType }>
    fallback: ReactNode
}> = ({ component, fallback }) => {
    const [Component, setComponent] = useState<ComponentType>()

    useEffect(() => {
        setComponent(() => lazy(component))
    }, [component])

    return <Suspense fallback={fallback}>{Component && <Component />}</Suspense>
}
