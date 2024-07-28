import type { FunctionComponent } from 'react'
import { PRELOAD_RESOURCES } from './data.ts'

/**
 * Preloads the resources used in the playground so that the hovers are faster.
 */
export const Preload: FunctionComponent = () => (
    <div className="hidden">
        {PRELOAD_RESOURCES.map(({ url, as }) =>
            as === 'image' ? (
                <img key={url} src={url} alt="" />
            ) : as === 'script' ? (
                <script key={url} src={url.replace('https+js', 'https')} type="module" async={true} />
            ) : null,
        )}
    </div>
)
