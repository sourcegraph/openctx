import { execSync } from 'child_process'
import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaResult,
    Provider,
} from '@openctx/provider'
import { readFile, readdir, writeFile } from 'fs/promises'
import JSZip from 'jszip'

/** Settings for the Google Docs OpenCtx provider. */
export type Settings = {
    path: string
}

/**
 * An [OpenCtx](https://openctx.org) provider that brings Google Docs context to code AI and
 * editors.
 */
const excelVBA: Provider<Settings> = {
    meta(): MetaResult {
        return { name: 'Excel VBA', mentions: {} }
    },

    async mentions(params: MentionsParams, settings: Settings): Promise<MentionsResult> {
        const files = (await readdir(settings.path, { recursive: true })).filter(
            name => !name.startsWith('~$') && name.endsWith('.xlsm')
        )
        return (files ?? []).map((file: any) => ({
            title: file,
            uri: `file://${settings.path}/${file}`,
        }))
    },

    async items(params: ItemsParams, settings: Settings): Promise<ItemsResult> {
        if (!params.mention) {
            return []
        }

        const modules = await extractVBAModules(params.mention.uri.replace(/^file:\/\//, ''))

        return [
            {
                title: params.mention.title,
                url: params.mention.uri,
                ai: {
                    content: modules.join('\n\n'),
                },
            },
        ]
    },
}

async function extractVBAModules(filePath: string): Promise<string[]> {
    // Read the .xlsm file as a zip archive
    const data = await readFile(filePath)
    const zip = await JSZip.loadAsync(data)

    // Get the entries in the zip file
    const vbaModules: string[] = []
    zip.forEach(async (relPath, zipEntry) => {
        if (relPath.endsWith('/vbaProject.bin')) {
            // Read the vbaProject.bin file
            const vbaProjectBin = await zipEntry.async('nodebuffer')

            const tmpFile = '/tmp/TMP1.ole'
            await writeFile(tmpFile, vbaProjectBin)

            // exec extract_vba_code.py
            const stdout = execSync(
                'python /Users/sqs/src/github.com/sourcegraph/openctx/provider/excel-vba/extract_vba_code.py ' +
                    tmpFile
            )
            vbaModules.push(stdout.toString())
        }
    })

    return vbaModules
}

export default excelVBA
