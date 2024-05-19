import type { AnnotationsResult, MetaResult } from '@openctx/provider'
import { describe, expect, test } from 'vitest'
import helloWorld from './index.js'

describe('helloWorld', () => {
    test('meta', () =>
        expect(helloWorld.meta({}, {})).toStrictEqual<MetaResult>({
            meta: { name: '✨ Hello World!' },
        }))

    test('annotations', () =>
        expect(
            helloWorld.annotations?.(
                {
                    uri: 'file:///a',
                    content: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'].join('\n'),
                },
                {}
            )
        ).toStrictEqual<AnnotationsResult>([
            {
                uri: 'file:///a',
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 1 },
                },
                item: {
                    title: '✨ Hello, world!',
                    url: 'https://openctx.org',
                    ui: {
                        hover: { text: 'From OpenCtx' },
                    },
                },
            },
            {
                uri: 'file:///a',
                range: {
                    start: { line: 10, character: 0 },
                    end: { line: 10, character: 1 },
                },
                item: {
                    title: '✨ Hello, world!',
                    url: 'https://openctx.org',
                    ui: {
                        hover: { text: 'From OpenCtx' },
                    },
                },
            },
        ]))
})
