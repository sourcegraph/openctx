/** @type {import('@opencodegraph/provider').Provider} */
export default {
  capabilities: () => ({ selector: [{ path: 'foo' }] }),
  annotations: (_params, settings) => ({
    items: [{ id: 'a', title: settings.myItemTitle }],
    annotations: [
      {
        item: { id: 'a' },
        range: { start: { line: 1, character: 2 }, end: { line: 3, character: 4 } },
      },
    ],
  }),
}
