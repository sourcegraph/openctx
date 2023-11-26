import { type Annotation } from '@opencodegraph/client'
import { firstValueFrom } from 'rxjs'
import type * as vscode from 'vscode'
import { type Controller } from './controller'

/**
 * The API exposed to other VS Code extensions.
 */
export interface ExtensionApi {
    /**
     * If this API changes, the version number will be incremented.
     */
    apiVersion(version: 1): {
        /**
         * Get OpenCodeGraph annotations for the document.
         */
        getAnnotations(doc: Pick<vscode.TextDocument, 'uri' | 'getText'>): Promise<Annotation<vscode.Range>[] | null>
    }
}

export function createApi(controller: Controller): ExtensionApi {
    return {
        apiVersion(version) {
            if (version !== 1) {
                throw new Error(`unsupported OpenCodeGraph extension API version: ${version}`)
            }
            return {
                getAnnotations: doc => firstValueFrom(controller.observeAnnotations(doc), { defaultValue: null }),
            }
        },
    }
}
