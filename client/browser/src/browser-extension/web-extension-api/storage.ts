import { type Observable, concat, defer, filter, from, map, of } from 'rxjs'
import { platform } from '../../shared/platform.js'
import { fromBrowserEvent } from './fromBrowserEvent.js'
import type { LocalStorageItems, ManagedStorageItems, SyncStorageItems } from './types.js'

interface ExtensionStorageItems {
    local: LocalStorageItems
    sync: SyncStorageItems
    managed: ManagedStorageItems
}

/**
 * Type-safe access to browser extension storage.
 */
export const storage: {
    [K in browser.storage.AreaName]: browser.storage.StorageArea<ExtensionStorageItems[K]>
} & {
    onChanged: browser.CallbackEventEmitter<
        (
            changes: browser.storage.ChangeDict<ExtensionStorageItems[typeof areaName]>,
            areaName: browser.storage.AreaName,
        ) => void
    >
} = globalThis.browser && browser.storage

export const observeStorageKey = <
    A extends browser.storage.AreaName,
    K extends keyof ExtensionStorageItems[A],
>(
    areaName: A,
    key: K,
): Observable<ExtensionStorageItems[A][K] | undefined> => {
    if (platform !== 'chrome-extension' && areaName === 'managed') {
        // Accessing managed storage throws an error on Firefox and on Safari.
        return of(undefined)
    }
    return concat(
        // Start with current value of the item
        defer(() =>
            from(
                (storage[areaName] as browser.storage.StorageArea<ExtensionStorageItems[A]>).get(key),
            ).pipe(map(items => (items as ExtensionStorageItems[A])[key])),
        ),
        // Emit every new value from change events that affect that item
        fromBrowserEvent(storage.onChanged).pipe(
            filter(([, name]) => areaName === name),
            map(([changes]) => changes),
            filter(
                (
                    changes,
                ): changes is {
                    [k in K]: browser.storage.StorageChange<ExtensionStorageItems[A][K]>
                } => Object.prototype.hasOwnProperty.call(changes, key),
            ),
            map(changes => changes[key].newValue),
        ),
    )
}
