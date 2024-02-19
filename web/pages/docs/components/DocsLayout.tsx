import { Menu } from 'lucide-react'
import {
    useCallback,
    useState,
    type FunctionComponent,
    type MouseEventHandler,
    type ReactNode,
} from 'react'
import { usePageContext } from 'vike-react/usePageContext'
import { Button } from '../../../src/components/ui/button.tsx'
import { Sheet, SheetContent, SheetTrigger } from '../../../src/components/ui/sheet.tsx'
import type { PageContextForContentPageIndex } from '../../../src/content/contentPages.tsx'
import { NavMenu } from './NavMenu.tsx'

export const DocsLayout: FunctionComponent<{ children: ReactNode }> = ({ children }) => {
    const pageContext = usePageContext() as PageContextForContentPageIndex
    return (
        <>
            <div className="flex items-center border-b border-border p-4 lg:hidden">
                <DocsSheet>
                    <NavMenu contentPageInfos={pageContext.contentPageInfos} />
                </DocsSheet>
            </div>
            <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 md:px-8">
                <NavMenu
                    contentPageInfos={pageContext.contentPageInfos}
                    className="fixed inset-0 left-[max(0px,calc(50%-45rem))] right-auto top-[3.8125rem] z-20 hidden w-[19rem] pb-10 pl-8 pr-6 lg:block"
                />
                <div className="mb-24 lg:pl-[19.6rem]">
                    <div className="mt-10">{children}</div>
                </div>
            </div>
        </>
    )
}

const DocsSheet: FunctionComponent<{ children: ReactNode }> = ({ children }) => {
    const [open, setOpen] = useState(false)

    // Close sheet when clicking on a link.
    const onContentClick = useCallback<MouseEventHandler<HTMLElement>>(event => {
        if (event.target instanceof HTMLAnchorElement) {
            setOpen(false)
        }
    }, [])

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild={true}>
                <Button variant="outline" size="icon">
                    <Menu />
                </Button>
            </SheetTrigger>
            <SheetContent className="bg-card" onClick={onContentClick}>
                {children}
            </SheetContent>
        </Sheet>
    )
}
