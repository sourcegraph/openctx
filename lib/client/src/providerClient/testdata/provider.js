/** @type {import('@opencodegraph/provider').Provider} */
export default {
  capabilities: () => ({ selector: [{ path: 'foo' }] }),
  annotations: (_params, settings) => [
    {
      item: { title: settings.myItemTitle },
      range: { start: { line: 1, character: 2 }, end: { line: 3, character: 4 } },
    },
  ],
}
