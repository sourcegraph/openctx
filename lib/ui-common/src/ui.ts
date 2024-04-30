import type { Annotation, Range } from '@openctx/schema'

export interface AnnotationWithRichRange<R extends Range> extends Omit<Annotation, 'range'> {
    range?: R
}

/**
 * Prepare annotations for presentation, which currently only entails sorting them.
 */
export function prepareAnnotationsForPresentation(anns: Annotation[]): Annotation[]
export function prepareAnnotationsForPresentation<R extends Range = Range>(
    anns: AnnotationWithRichRange<R>[]
): AnnotationWithRichRange<R>[]
export function prepareAnnotationsForPresentation<R extends Range = Range>(
    anns: AnnotationWithRichRange<R>[]
): AnnotationWithRichRange<R>[] {
    return anns.sort((a, b) => (a.range?.start.line ?? 0) - (b.range?.start.line ?? 0))
}
