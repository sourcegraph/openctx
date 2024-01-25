
import { describe, expect, test } from 'vitest'

import { HTTP } from './http'


describe('http adapter', () => {
    const token = 'foobar'
    const url = 'https://httpbin.org'
    const http = new HTTP(url, token)

    test('get', async () => {
        const r = await http.get('/get')
        expect(r.status).toEqual(200)
    })

    test('post', async () => {
        const r = await http.post('/post', {text: 'hello'})
        expect(r.status).toEqual(200)
    })

    test('put', async () => {
        const r = await http.put('/put', {text: 'hello'})
        expect(r.status).toEqual(200)
    })

    test('delete', async () => {
        const r = await http.delete('/delete')
        expect(r.status).toEqual(200)
    })
})