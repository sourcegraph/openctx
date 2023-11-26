/**
 * Metadata about code
 */
export interface OpenCodeGraphData {
    items: OpenCodeGraphItem[]
    annotations: OpenCodeGraphAnnotation[]
}
export interface OpenCodeGraphItem {
    id: string
    title: string
    detail?: string
    /**
     * An external URL with more information.
     */
    url?: string
    /**
     * Show a preview of the link.
     */
    preview?: boolean
    /**
     * If `preview` is set, show this URL as the preview instead of `url`.
     */
    previewUrl?: string
    image?: OpenCodeGraphImage
}
export interface OpenCodeGraphImage {
    url: string
    width?: number
    height?: number
    alt?: string
}
export interface OpenCodeGraphAnnotation {
    range: OpenCodeGraphRange
    item: OpenCodeGraphItemRef
}
export interface OpenCodeGraphRange {
    start: OpenCodeGraphPosition
    end: OpenCodeGraphPosition
}
export interface OpenCodeGraphPosition {
    line: number
    character: number
}
export interface OpenCodeGraphItemRef {
    id: string
}
