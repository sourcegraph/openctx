// Copy pasted from https://sourcegraph.com/github.com/makenotion/notion-sdk-js@7950edc034d3007b0612b80d3f424baef89746d9/-/blob/examples/parse-text-from-any-block-type/index.js
// The typescript definitions in the SDK make it very hard to convert this code into typescript, so we just directly use js sample code they provide.
//
// Copyright 2021 Notion Labs, Inc. See MIT License at https://github.com/makenotion/notion-sdk-js/blob/v2.2.15/LICENSE

// Take rich text array from a block child that supports rich text and return the plain text.
// Note: All rich text objects include a plain_text field.
const getPlainTextFromRichText = richText => {
    return richText.map(t => t.plain_text).join('')
    // Note: A page mention will return "Undefined" as the page name if the page has not been shared with the integration. See: https://developers.notion.com/reference/block#mention
}

// Use the source URL and optional caption from media blocks (file, video, etc.)
const getMediaSourceText = block => {
    let source
    let caption

    if (block[block.type].external) {
        source = block[block.type].external.url
    } else if (block[block.type].file) {
        source = block[block.type].file.url
    } else if (block[block.type].url) {
        source = block[block.type].url
    } else {
        source = '[Missing case for media block types]: ' + block.type
    }
    // If there's a caption, return it with the source
    if (block[block.type].caption.length) {
        caption = getPlainTextFromRichText(block[block.type].caption)
        return caption + ': ' + source
    }
    // If no caption, just return the source URL
    return source
}

// Get the plain text from any block type supported by the public API.
export const getTextFromBlock = block => {
    let text

    // Get rich text from blocks that support it
    if (block[block.type].rich_text) {
        // This will be an empty string if it's an empty line.
        text = getPlainTextFromRichText(block[block.type].rich_text)
    }
    // Get text for block types that don't have rich text
    else {
        switch (block.type) {
            case 'unsupported':
                // The public API does not support all block types yet
                text = '[Unsupported block type]'
                break
            case 'bookmark':
                text = block.bookmark.url
                break
            case 'child_database':
                text = block.child_database.title
                // Use "Query a database" endpoint to get db rows: https://developers.notion.com/reference/post-database-query
                // Use "Retrieve a database" endpoint to get additional properties: https://developers.notion.com/reference/retrieve-a-database
                break
            case 'child_page':
                text = block.child_page.title
                break
            case 'embed':
            case 'video':
            case 'file':
            case 'image':
            case 'pdf':
                text = getMediaSourceText(block)
                break
            case 'equation':
                text = block.equation.expression
                break
            case 'link_preview':
                text = block.link_preview.url
                break
            case 'synced_block':
                // Provides ID for block it's synced with.
                text = block.synced_block.synced_from
                    ? 'This block is synced with a block with the following ID: ' +
                      block.synced_block.synced_from[block.synced_block.synced_from.type]
                    : 'Source sync block that another blocked is synced with.'
                break
            case 'table':
                // Only contains table properties.
                // Fetch children blocks for more details.
                text = 'Table width: ' + block.table.table_width
                break
            case 'table_of_contents':
                // Does not include text from ToC; just the color
                text = 'ToC color: ' + block.table_of_contents.color
                break
            case 'breadcrumb':
            case 'column_list':
            case 'divider':
                text = 'No text available'
                break
            default:
                text = '[Needs case added]'
                break
        }
    }
    // Blocks with the has_children property will require fetching the child blocks. (Not included in this example.)
    // e.g. nested bulleted lists
    if (block.has_children) {
        // For now, we'll just flag there are children blocks.
        text = text + ' (Has children)'
    }
    // Includes block type for readability. Update formatting as needed.
    return block.type + ': ' + text
}
