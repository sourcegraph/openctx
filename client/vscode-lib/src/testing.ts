import type { Controller } from './controller.js'

/**
 * The API exposed for this VS Code extension's tests.
 */
export interface ExtensionApiForTesting extends Pick<Controller, 'meta' | 'items' | 'annotations'> {}

export function createApiForTesting(controller: Controller): ExtensionApiForTesting {
    return controller
}
