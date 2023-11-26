import '@code-hike/mdx/styles'
import type { MDXComponents } from 'mdx/types.js'
import styles from './MdxComponents.module.css'
import './github-from-css.css'

export const MDX_COMPONENTS: Readonly<MDXComponents> = {
    wrapper: ({ children }) => <div className={styles.wrapper}>{children}</div>,
    a: ({ children, href, ...props }) => (
        <a href={href?.replace(/\.mdx(?=#|$)/, '')} {...props}>
            {children}
        </a>
    ),
}
