import type { FunctionComponent } from 'react'
import { layoutItemClassName, normalLayoutClassName } from '../../src/layout/config.ts'
import { Playground } from './Playground.tsx'
import Text from './text.mdx'

export const Page: FunctionComponent = () => (
    <>
        <div className={normalLayoutClassName}>
            <Text />
        </div>
        <Playground className={layoutItemClassName} />
    </>
)
