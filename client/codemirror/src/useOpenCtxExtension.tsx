import type { Extension } from '@codemirror/state'
import type { Annotation } from '@openctx/client'
import { ChipList, IndentationWrapper } from '@openctx/ui-react'
import { useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { openCtxData, showOpenCtxDecorations } from './extension'

export function useOpenCtxExtension({
    visibility,
    anns,
}: {
    visibility: boolean
    anns: Annotation[] | undefined
}): Extension {
    // TODO(sqs): useCompartment results in sometimes the facet data being stale because the editor is reconfigured
    return useMemo(
        () =>
            visibility
                ? [
                      openCtxData(anns),
                      showOpenCtxDecorations({
                          visibility,
                          createDecoration(container, { indent, anns }) {
                              const root = createRoot(container)
                              root.render(
                                  <IndentationWrapper indent={indent}>
                                      <ChipList
                                          annotations={anns}
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
        [visibility, anns]
    )
}
