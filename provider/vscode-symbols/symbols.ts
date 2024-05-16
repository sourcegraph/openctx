import type { Range } from '@openctx/provider'
import fuzzysort from 'fuzzysort'
import * as vscode from 'vscode'

/**
 * Fields that are common to any context item included in chat messages.
 */
interface ContextItemCommon {
    /**
     * The URI of the document (such as a file) where this context resides.
     */
    uri: string

    /**
     * If only a subset of a file is included as context, the range of that subset.
     */
    range?: Range

    /**
     * The content, either the entire document or the range subset.
     */
    content?: string

    repoName?: string
    revision?: string

    /**
     * For anything other than a file or symbol, the title to display (e.g., "Terminal Output").
     */
    title?: string

    /**
     * The token count of the item's content.
     */
    size?: number

    /**
     * Whether the item is excluded by Cody Ignore.
     */
    isIgnored?: boolean

    /**
     * Whether the content of the item is too large to be included as context.
     */
    isTooLarge?: boolean

    /**
     * The ID of the {@link ContextMentionProvider} that supplied this context item (or `undefined`
     * if from a built-in context source such as files and symbols).
     */
    provider?: string
}

interface ContextItemSymbol extends ContextItemCommon {
    type: 'symbol'

    /** The name of the symbol, used for presentation only (not semantically meaningful). */
    symbolName: string

    /** The kind of symbol, used for presentation only (not semantically meaningful). */
    kind: SymbolKind
}

/** The valid kinds of a symbol. */
type SymbolKind = 'class' | 'function' | 'method'

export async function getSymbolContextFiles(
    query: string,
    maxResults = 20
): Promise<ContextItemSymbol[]> {
    if (!query.trim()) {
        return []
    }

    // doesn't support cancellation tokens :(
    const queryResults = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
        'vscode.executeWorkspaceSymbolProvider',
        query
    )

    const relevantQueryResults = queryResults?.filter(
        symbol =>
            (symbol.kind === vscode.SymbolKind.Function ||
                symbol.kind === vscode.SymbolKind.Method ||
                symbol.kind === vscode.SymbolKind.Class ||
                symbol.kind === vscode.SymbolKind.Interface ||
                symbol.kind === vscode.SymbolKind.Enum ||
                symbol.kind === vscode.SymbolKind.Struct ||
                symbol.kind === vscode.SymbolKind.Constant ||
                // in TS an export const is considered a variable
                symbol.kind === vscode.SymbolKind.Variable) &&
            // TODO(toolmantim): Remove once https://github.com/microsoft/vscode/pull/192798 is in use (test: do a symbol search and check no symbols exist from node_modules)
            !symbol.location?.uri?.fsPath.includes('node_modules/')
    )

    const results = fuzzysort.go(query, relevantQueryResults, {
        key: 'name',
        limit: maxResults,
    })

    // TODO(toolmantim): Add fuzzysort.highlight data to the result so we can show it in the UI

    const symbols = results.map(result => result.obj)

    if (!symbols.length) {
        return []
    }

    const matches = await Promise.all(
        symbols.map(
            symbol =>
                ({
                    type: 'symbol',
                    uri: symbol.location.uri.toString(),
                    range: symbol.location.range,
                    // TODO(toolmantim): Update the kinds to match above
                    kind: symbol.kind === vscode.SymbolKind.Class ? 'class' : 'function',
                    symbolName: symbol.name,
                }) satisfies ContextItemSymbol
        )
    )

    return matches.flat()
}
