import { z } from 'zod'

export interface BlobInfo {
    repoName: string
    revision: string
    path: string
    range: {
        start: { line: number; character: number }
        end: { line: number; character: number }
    }
    content: string
}

export const BlobResponseSchema = z.object({
    repository: z.object({
        commit: z.object({
            blob: z.object({
                path: z.string(),
                url: z.string(),
                languages: z.array(z.string()),
                content: z.string(),
            }),
        }),
    }),
})

export type BlobResponse = z.infer<typeof BlobResponseSchema>

export const BLOB_QUERY = `
query Blob($repoName: String!, $revspec: String!, $path: String!, $startLine: Int!, $endLine: Int!) {
    repository(name: $repoName) {
        commit(rev: $revspec) {
            blob(path: $path) {
                path
                url
                languages
                content(startLine: $startLine, endLine: $endLine)
            }
        }
    }
}`
