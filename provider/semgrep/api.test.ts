import { describe, expect, test } from 'vitest'

import { urlfor } from './api.js'

describe('api urlfor', () => {
    test('url parameters', () => {
        expect(urlfor('depl', 'repo')).toEqual('https://semgrep.dev/orgs/depl/findings?repo=repo')
        expect(urlfor('depl', 'repo', 123)).toEqual(
            'https://semgrep.dev/orgs/depl/findings/123?repo=repo'
        )
    })
})
