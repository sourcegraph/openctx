/** @type {import('@opencodegraph/provider').OpenCodeGraphProvider} */
export default {
  capabilities: () => ({}),
  annotations: () => ({
    items: [{ id: 'a', title: 'A' }],
    annotations: [
      {
        item: { id: 'a' },
        range: { start: { line: 1, character: 2 }, end: { line: 3, character: 4 } },
      },
    ],
  }),
}
