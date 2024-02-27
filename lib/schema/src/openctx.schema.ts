/**
 * Metadata about code
 */
export type Schema = Item | Annotation
/**
 * A hint about how to best present an annotation to the human in the client's user interface.
 *
 * - `prefer-link-over-detail`: Prefer to show the item as a link over showing the detail text, if the client does not cleanly support doing both.
 */
export type PresentationHint = 'prefer-link-over-detail'

/**
 * An item contains contextual information relevant to a resource (or a range within a resource).
 */
export interface Item {
    /**
     * A descriptive title.
     */
    title: string
    /**
     * An external URL with more information.
     */
    url?: string
    ui?: UserInterface
    ai?: AssistantInfo
}
/**
 * The human user interface of the item, with information for human consumption.
 */
export interface UserInterface {
    hover?: Hover
}
/**
 * Additional information for the human, shown in a tooltip-like widget when they interact with the item.
 */
export interface Hover {
    /**
     * The contents of the hover as Markdown, preferred over the text when rendered Markdown or HTML can be displayed.
     */
    markdown?: string
    /**
     * The contents of the hover as plain text, used when rendered Markdown or HTML can't be displayed.
     */
    text?: string
}
/**
 * Information from the item intended for consumption by AI, not humans.
 */
export interface AssistantInfo {
    /**
     * Text content for AI to consume.
     */
    content?: string
}
/**
 * An annotation attaches an Item to a range in a document.
 */
export interface Annotation {
    /**
     * The URI of the document.
     */
    uri: string
    range?: Range
    item: Item
    /**
     * Hints about the best way to present this annotation. Different clients interpret hints differently because they have different user interfaces.
     */
    presentationHints?: PresentationHint[]
}
/**
 * The range in the resource that this item applies to. If not set, the item applies to the entire resource.
 */
export interface Range {
    start: Position
    end: Position
}
export interface Position {
    line: number
    character: number
}
