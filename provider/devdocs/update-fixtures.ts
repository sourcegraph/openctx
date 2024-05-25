import path from 'path'
import url from 'url'
import fs from 'fs/promises'
import { fetchDoc, fetchIndex } from './devdocs.js'

/**
 * USAGE pnpm update-fixtures
 *
 * This updates the fixtures from https://devdocs.io. We store a subset of the
 * index.json file to avoid a large file in our repository.
 */

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function writeFixture(relPath: string, content: string) {
    const p = path.join(__dirname, '__fixtures__', relPath)
    await fs.mkdir(path.dirname(p), { recursive: true })
    await fs.writeFile(p, content)
}

async function main() {
    const devdocsURL = 'https://devdocs.io/go/'
    const index = await fetchIndex(devdocsURL)

    // Filter out entries that don't match what we test to reduce the size.
    index.types = []
    index.entries = index.entries.filter(
        entry =>
            entry.name.toLowerCase().includes('teereader') ||
            entry.name.toLowerCase().includes('strconv')
    )
    await writeFixture('index.json', JSON.stringify(index))

    const docs = ['strconv', 'io']
    for (const slug of docs) {
        const url = `https://devdocs.io/go/${slug}/index`
        const { content } = await fetchDoc(url)
        await writeFixture(path.join(slug, 'index.html'), content)
    }
}

await main()
