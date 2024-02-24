/**
 * A hint about how to best present an item to the human in the client's user interface.
 *
 * - `show-at-top-of-file`: Group all items with the same `ui.group` value together and display them at the top of the file instead of at their given file range.
 * - `prefer-link-over-detail`: Prefer to show the item as a link over showing the detail text, if the client does not cleanly support doing both.
 */
export type PresentationHint = 'show-at-top-of-file' | 'prefer-link-over-detail'

/**
 * Metadata about code
 */
export interface Schema {
    items?: Item[]
}
/**
 * An item contains contextual information relevant to a file (or a range within a file).
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
    range?: Range
}
/**
 * The human user interface of the item, with information for human consumption.
 */
export interface UserInterface {
    hover?: Hover
    /**
     * If set, this item is grouped together with all other items with the same `group` value.
     */
    group?: string
    /**
     * Hints about the best way to present this item. Different clients interpret hints differently because they have different user interfaces.
     */
    presentationHints?: PresentationHint[]
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
     * The contents of the hover as plain text.
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
 * The range in the file that this item applies to. If not set, the item applies to the entire file.
 */
export interface Range {
    start: Position
    end: Position
}
export interface Position {
    line: number
    character: number
}
