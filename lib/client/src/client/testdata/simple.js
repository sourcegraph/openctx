/** @type {import('@openctx/provider').Provider} */
export default {
  capabilities: () => ({}),
  items: () => [
    {
      title: 'A',
      range: { start: { line: 1, character: 2 }, end: { line: 3, character: 4 } },
    },
  ],
}
