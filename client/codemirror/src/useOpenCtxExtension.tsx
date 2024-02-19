import type { Extension } from '@codemirror/state'
import { type Annotation } from '@openctx/client'
import { IndentationWrapper, ItemChipList } from '@openctx/ui-react'
import { useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { openCtxData, showOpenCtxDecorations } from './extension'

export function useOpenCtxExtension({
    visibility,
    annotations,
}: {
    visibility: boolean
    annotations: Annotation[] | undefined
}): Extension {
    // TODO(sqs): useCompartment results in sometimes the facet data being stale because the editor is reconfigured
    return useMemo(
        () =>
            visibility
                ? [
                      openCtxData(annotations),
                      showOpenCtxDecorations({
                          visibility,
                          createDecoration(container, { indent, items }) {
                              const root = createRoot(container)
                              root.render(
                                  <IndentationWrapper indent={indent}>
                                      <ItemChipList
                                          items={items}
                                          chipClassName="octx-chip"
                                          popoverClassName="octx-chip-popover"
                                      />
                                  </IndentationWrapper>
                              )
                              return {
                                  destroy() {
                                      root.unmount()
                                  },
                              }
                          },
                      }),
                  ]
                : [],
        [visibility, annotations]
    )
}
