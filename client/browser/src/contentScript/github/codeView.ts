import type { Annotation, AnnotationsParams } from '@openctx/client'
import { createChipList } from '@openctx/ui-standalone'
import { EMPTY, Observable, combineLatest, debounceTime, map, mergeMap, startWith, tap } from 'rxjs'
import { toLineRangeStrings } from '../../shared/util/toLineRangeStrings.js'
import { DEBUG, debugTap } from '../debug.js'
import { withDOMElement } from '../detectElements.js'
import { LINE_CHIPS_CLASSNAME, annsByLine, styledChipListParams } from '../openCtxUtil.js'

/**
 * Inject OpenCtx features into the GitHub code view.
 *
 * Good URLs to test on:
 *
 * - Small file: https://github.com/sourcegraph/sourcegraph/blob/main/cmd/repo-updater/internal/repoupdater/observability.go
 * - Large file: https://github.com/sourcegraph/sourcegraph/blob/main/internal/repos/github.go#L1300
 */
export function injectOnGitHubCodeView(
    location: URL,
    annotationsChanges: (params: AnnotationsParams) => Observable<Annotation[]>,
): Observable<void> {
    // All GitHub code view URLs contain `/blob/` in the path. (But not all URLs with `/blob/` are code
    // views, so we still need to check for the presence of DOM elements below. For example, there
    // could be a repository named `myorg/blob`, which would have URLs containing `/blob/` on
    // non-code view pages.)
    if (!location.pathname.includes('/blob/')) {
        return EMPTY
    }

    return combineLatest([
        // If these don't emit, then the page is not recognized as a GitHub code view. This means
        // it's a different GitHub page, or the DOM structure has changed significantly.
        withDOMElement<HTMLTextAreaElement>('#read-only-cursor-text-area'),
        withDOMElement<HTMLElement>('react-app[app-name="react-code-view"]'),
    ]).pipe(
        mergeMap(([cursorTextArea, reactCodeView]) => {
            interface GitHubCodeView {
                cursorTextArea: HTMLTextAreaElement
                reactCodeView: HTMLElement
            }
            const view: GitHubCodeView = { cursorTextArea, reactCodeView }

            const content = view.cursorTextArea.value

            const githubInitialPath = view.reactCodeView.getAttribute('initial-path')
            if (!githubInitialPath) {
                throw new Error('could not find initialPath')
            }
            const fileUri = `github://github.com/${githubInitialPath}`

            return combineLatest([
                annotationsChanges({ content, uri: fileUri }),
                significantCodeViewChanges.pipe(
                    debounceTime(200),
                    startWith(undefined),
                    debugTap(viewState => {
                        console.groupCollapsed('significantCodeViewChanges')
                        console.count('significantCodeViewChanges count')
                        console.log(viewState)
                        console.groupEnd()
                    }),
                ),
            ]).pipe(
                tap(([anns]) => {
                    if (DEBUG) {
                        console.count('redraw')
                        console.time('redraw')
                    }
                    redraw(anns)
                    if (DEBUG) {
                        console.timeEnd('redraw')
                    }
                }),
                map(() => undefined),
            )
        }),
    )
}

function redraw(anns: Annotation[]): void {
    // TODO(sqs): optimize this by only redrawing changed chips

    const oldChips = document.querySelectorAll(`.${LINE_CHIPS_CLASSNAME}`)
    for (const oldChip of Array.from(oldChips)) {
        oldChip.remove()
    }

    const byLine = annsByLine(anns)

    // TODO(sqs): switch instead to looping over byLine so we only do work on lines that have
    // items on them.
    const codeRowEls = document.querySelectorAll<HTMLDivElement>('.react-code-line-contents')
    for (const el of Array.from(codeRowEls)) {
        const fileLineEl = el.querySelector<HTMLDivElement>('& > div > .react-file-line')
        if (fileLineEl === null || !(fileLineEl instanceof HTMLElement)) {
            throw new Error('unable to determine file line element')
        }
        const lineNumberStr = fileLineEl.dataset.lineNumber
        if (!lineNumberStr) {
            throw new Error('unable to determine line number')
        }
        const line = Number.parseInt(lineNumberStr, 10) - 1

        const lineAnns = byLine.find(i => i.line === line)?.anns
        if (lineAnns !== undefined) {
            addChipsToCodeRow(line, lineAnns)

            try {
                // Need to set z-index or else the chips won't be hoverable or clickable because the
                // virtual textarea covers them. This does not seem to cause any other issues.
                const lineParentEl = fileLineEl.parentElement?.parentElement
                if (lineParentEl && !lineParentEl.style.zIndex) {
                    lineParentEl.style.zIndex = '1'
                }
            } catch (error) {
                console.debug(`Unable to set z-index on file line parent for line ${line}.`)
            }
        }
    }

    function addChipsToCodeRow(line: number, anns: Annotation[]): void {
        const lineEl = document.querySelector(`.react-file-line[data-line-number="${line + 1}"]`)
        if (lineEl) {
            const chipList = createChipList(
                styledChipListParams({
                    annotations: anns,
                }),
            )
            lineEl.append(chipList)
        }
    }
}

interface GitHubCodeViewState {
    renderedLineRanges: string[]
    visibleLineRanges?: string[]
}

/**
 * An Observable that emits whenever the code view has a significant change to its view state (which
 * means that anything rendered on top of it needs to be re-rendered).
 */
const significantCodeViewChanges: Observable<GitHubCodeViewState> = new Observable(observer => {
    const intersectionCallback = (): void => {
        // Since our scroll position changed, reanalyze the DOM to see which lines are the new
        // boundaries and start observing those.
        observeBoundaryLines()

        observer.next(getViewState())
    }

    const intersectionObserver = new IntersectionObserver(() => intersectionCallback(), {
        root: null, // entire viewport
        rootMargin: '40px',
    })
    observer.add(() => intersectionObserver.disconnect())

    function observeBoundaryLines(): void {
        for (const line of getRenderedBoundaryLines()) {
            intersectionObserver.observe(getReactFileLine(line))
        }
    }

    // Set up initial observers.
    observeBoundaryLines()

    return observer
})

function getViewState(): GitHubCodeViewState {
    return {
        renderedLineRanges: toLineRangeStrings(getRenderedLines()),
        visibleLineRanges: DEBUG ? toLineRangeStrings(getVisibleLines()) : undefined,
    }
}

function getRenderedLines(): number[] {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.react-file-line'))
    const lineNumbers = lineNumbersFromReactFileLines(els)
    return lineNumbers
}

function getVisibleLines(): number[] {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.react-file-line'))
    const lineNumbers = lineNumbersFromReactFileLines(els.filter(isElementInViewport))
    return lineNumbers
}

function isElementInViewport(el: HTMLElement): boolean {
    const rect = el.getBoundingClientRect()
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight
    return !(rect.right < 0 || rect.bottom < 0 || rect.left > viewportWidth || rect.top > viewportHeight)
}

function lineNumbersFromReactFileLines(reactFileLineEls: HTMLElement[]): number[] {
    return reactFileLineEls
        .map(el => (el.dataset.lineNumber ? Number.parseInt(el.dataset.lineNumber, 10) - 1 : null))
        .filter((line): line is number => line !== null)
}

function getReactFileLine(lineNumber: number): HTMLDivElement {
    const el = document.querySelector<HTMLDivElement>(
        `.react-file-line[data-line-number="${lineNumber + 1}"]`,
    )
    if (!el) {
        throw new Error(`no .react-file-line for line number ${lineNumber}`)
    }
    return el
}

/**
 * Get the line numbers of the first and last lines (for each sequentially rendered section) that
 * are rendered.
 */
function getRenderedBoundaryLines(): number[] {
    const renderedLines = getRenderedLines()

    const boundaryLines: number[] = []
    for (const [i, line] of renderedLines.entries()) {
        if (i === 0 || line === renderedLines.length - 1) {
            boundaryLines.push(line)
            continue
        }

        const lastLine = renderedLines[i - 1]
        if (line - lastLine !== 1) {
            boundaryLines.push(lastLine)
            boundaryLines.push(line)
        }
    }

    return sortUnique(boundaryLines)
}

function sortUnique<T>(array: T[]): T[] {
    return array.sort().filter((value, index, array) => value !== array[index - 1])
}
