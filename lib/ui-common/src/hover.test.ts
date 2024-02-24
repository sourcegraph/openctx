import { describe, expect, test } from 'vitest'
import { renderHoverToHTML } from './hover'

describe('renderHoverToHTML', () => {
    test('returns null when hover is undefined', () => {
        expect(renderHoverToHTML(undefined)).toBeNull()
    })

    test('returns text format when hover format is not markdown', () => {
        expect(
            renderHoverToHTML({
                text: 'Some **text**',
            })
        ).toEqual({
            value: 'Some **text**',
            format: 'text',
        })
    })

    describe('markdown', () => {
        test('renders to HTML', () => {
            expect(
                renderHoverToHTML({
                    markdown: '## Header\n\n* list',
                    text: 'foo',
                })
            ).toEqual({
                value: '<h2>Header</h2>\n<ul>\n<li>list</li>\n</ul>',
                format: 'html',
            })
        })

        test('sanitizes HTML', () => {
            expect(
                renderHoverToHTML({
                    markdown:
                        '**a** <strong>z</strong> <script>alert("xss")</script> <img src="javascript:foo"/> <a href="javascript:bar">x</a>',
                })
            ).toEqual({
                value: '<strong>a</strong> <strong>z</strong>  <img src /> <a href>x</a>',
                format: 'html',
            })
        })
    })
})
