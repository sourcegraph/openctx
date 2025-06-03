import { describe, expect, test } from 'vitest'
import { type Contents, parseGolang } from './parser.js'

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

        expect(parseGolang(content)).toStrictEqual<Contents>({
            package: 'example',
            funcs: {
                'example.A': {
                    name: 'A',
                    range: { start: { line: 4, character: 5 }, end: { line: 4, character: 6 } },
                },
                'example.b_func': {
                    name: 'b_func',
                    range: { start: { line: 5, character: 5 }, end: { line: 5, character: 11 } },
                },
                'example.A2': {
                    name: 'A2',
                    range: { start: { line: 6, character: 5 }, end: { line: 6, character: 7 } },
                },
                'example.(*Thing).doStuff': {
                    name: 'doStuff',
                    range: { start: { line: 12, character: 16 }, end: { line: 12, character: 23 } },
                    receiver: '*Thing',
                },
                'example.(Thing).String': {
                    name: 'String',
                    range: { start: { line: 13, character: 15 }, end: { line: 13, character: 21 } },
                    receiver: 'Thing',
                },
            },
        })
    })
})
