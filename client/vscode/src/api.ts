import type { Annotation, Item, ItemsParams } from '@openctx/client'
import type * as vscode from 'vscode'
import type { Controller } from './controller'

/**
 * The API exposed to other VS Code extensions.
 */
export interface ExtensionApi {
    /**
     * If this API changes, the version number will be incremented.
     */
    apiVersion(version: 1): {
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
}

export function createApi(controller: Controller): ExtensionApi {
    return {
        apiVersion(version) {
            if (version !== 1) {
                throw new Error(`unsupported OpenCtx extension API version: ${version}`)
            }
            return {
                getItems: params => controller.items(params),
                getAnnotations: doc => controller.annotations(doc),
            }
        },
    }
}
