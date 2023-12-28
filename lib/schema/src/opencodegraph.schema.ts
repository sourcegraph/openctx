/**
 * Metadata about code
 */
export interface Data {
    items: Item[]
    annotations: Annotation[]
}
export interface Item {
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
    image?: ItemImage
}
export interface ItemImage {
    url: string
    width?: number
    height?: number
    alt?: string
}
export interface Annotation {
    range: Range
    item: ItemRef
}
export interface Range {
    start: Position
    end: Position
}
export interface Position {
    line: number
    character: number
}
export interface ItemRef {
    id: string
}
