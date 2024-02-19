import clsx from 'clsx'
import { forwardRef } from 'react'
import { usePageContext } from 'vike-react/usePageContext'

type Props = { href: string; activeClassName?: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>

export const Link = forwardRef<HTMLAnchorElement, Props>(
    ({ href, className, activeClassName, ...props }, ref) => {
        const pageContext = usePageContext()
        const { urlPathname } = pageContext
        const isActive = href === '/' ? urlPathname === href : urlPathname.startsWith(href)
        return (
            <a
                ref={ref}
                href={href}
                className={clsx(isActive ? activeClassName : undefined, className)}
                {...props}
            />
        )
    }
)
Link.displayName = 'Link'
