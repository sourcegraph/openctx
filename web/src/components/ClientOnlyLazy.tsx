import type { FunctionComponent } from 'mdx/types'
import { lazy, Suspense, useEffect, useState, type ComponentType, type ReactNode } from 'react'

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
