import type { Annotation, Item, ItemsParams } from '@openctx/client'
import type * as vscode from 'vscode'
import type { Controller } from './controller'

/**
 * The API exposed for this VS Code extension's tests.
 */
export interface ExtensionApiForTesting {
    /**
     * Get OpenCtx items for the document.
     */
    getItems(params: ItemsParams): Promise<Item[] | null>

    /**
     * Get OpenCtx annotations for the document.
     */
    getAnnotations(
        doc: Pick<vscode.TextDocument, 'uri' | 'getText'>
    ): Promise<Annotation<vscode.Range>[] | null>
}

export function createApiForTesting(controller: Controller): ExtensionApiForTesting {
    return {
        getItems: params => controller.items(params),
        getAnnotations: doc => controller.annotations(doc),
    }
}
