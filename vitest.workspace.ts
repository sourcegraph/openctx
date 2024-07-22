import { readFileSync } from 'node:fs'
import path from 'node:path'
import { load } from 'js-yaml'

interface PnpmWorkspaceFile {
    packages: string[]
}

function fromPnpmWorkspaceFile(filePath: string): string[] {
    return (load(readFileSync(filePath, 'utf8')) as PnpmWorkspaceFile).packages.map(
        p => `${p}/{vitest,vite}.config.ts`
    )
}

export default fromPnpmWorkspaceFile(path.join(__dirname, 'pnpm-workspace.yaml'))
