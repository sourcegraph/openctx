import { type FunctionComponent } from 'react'
import { PRELOAD_RESOURCES } from './data.ts'

/**
 * Preloads the resources used in the playground so that the hovers are faster.
 */
export const Preload: FunctionComponent<{ preloadIframes?: boolean }> = ({ preloadIframes = false }) => (
    <div className="hidden">
        {PRELOAD_RESOURCES.map(({ url, as }) =>
            as === 'image' ? (
                <img key={url} src={url} alt="" />
            ) : as === 'script' ? (
                <script key={url} src={url.replace('https+js', 'https')} type="module" async={true} />
            ) : preloadIframes ? (
                <iframe key={url} title={url} src={url} sandbox="allow-scripts allow-same-origin" />
            ) : null
        )}
    </div>
)
