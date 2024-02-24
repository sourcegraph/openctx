import { describe, expect, test } from 'vitest'
import { type Configuration, configurationFromUserInput } from './configuration'

describe('configurationFromUserInput', () => {
    test('empty', () =>
        expect(configurationFromUserInput({})).toStrictEqual<Configuration>({
            enable: true,
            debug: false,
            providers: [],
        }))

    test('fields set', () =>
        expect(
            configurationFromUserInput({
                enable: false,
                debug: true,
                providers: {
                    'https://example.com/b': true,
                    'https://example.com/c': false,
                    'https://example.com/a': {},
                },
            })
        ).toStrictEqual<Configuration>({
            enable: false,
            debug: true,
            providers: [
                { providerUri: 'https://example.com/a', settings: {} },
                { providerUri: 'https://example.com/b', settings: {} },
            ],
        }))
})
