import { describe, expect, test } from 'vitest'
import parseGolang, { type Func } from './parser.js'

describe('file parsing', () => {
    test('golang', () => {
        const content = `package example

import "fmt"
        
func A(a string) {}
func b_func() {}
func A2() {
    fmt.Print("hello pprof")
}

type Thing struct {}

func (t *Thing) doStuff(i int) {}
func (t Thing) String() string { return "thing" }
        `

        expect(parseGolang(content)).toStrictEqual<Func[]>([
            {
                package: 'example',
                function: 'A',
                range: { start: { line: 4, character: 5 }, end: { line: 4, character: 6 } },
                pprofRegex: 'example.A',
            },
            {
                package: 'example',
                function: 'b_func',
                range: { start: { line: 5, character: 5 }, end: { line: 5, character: 11 } },
                pprofRegex: 'example.b_func',
            },
            {
                package: 'example',
                function: 'A2',
                range: { start: { line: 6, character: 5 }, end: { line: 6, character: 7 } },
                pprofRegex: 'example.A2',
            },
            {
                package: 'example',
                function: 'doStuff',
                range: { start: { line: 12, character: 16 }, end: { line: 12, character: 23 } },
                pprofRegex: 'example.(*Thing).doStuff',
                receiver: '*Thing',
            },
            {
                package: 'example',
                function: 'String',
                range: { start: { line: 13, character: 15 }, end: { line: 13, character: 21 } },
                pprofRegex: 'example.(Thing).String',
                receiver: 'Thing',
            },
        ])
    })
})
