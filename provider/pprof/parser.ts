import type { Range } from '@openctx/provider'

const packageRegex = /^package (\w+)/m
const funcRegex = /^func (\w+)(?:\()/m
const methodRegex = /^func \(\w+ (\*)?(\w+)\) (\w+)(?:\()/m

export interface Contents {
    package: string

    /** The key for each function is its fully-qualified name, e.g. example.MyFunc or example.(*Thing).MyMethod,
     * as they are unique within the file.
     */
    funcs: Record<string, Func>
}

/** Func is a Go function or method with additional metadata to help locate it in the file and filter for in in `pprof`.  */
export interface Func {
    name: string
    range: Range
    receiver?: string
}

export function parseGolang(source: string): Contents | null {
    const pkgMatch = packageRegex.exec(source)
    if (!pkgMatch || !pkgMatch.length) {
        return null
    }
    const pkg = pkgMatch[1]
    const result: Contents = {
        package: pkg,
        funcs: {},
    }

    const lines = source.split('\n')
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        const readFuncName = (start: number): { func: string; end: number } => {
            let end = start
            for (const ch of line.substring(start).split('')) {
                if (ch === '(') {
                    break
                }
                end++
            }
            return {
                func: line.substring(start, end),
                end: end,
            }
        }

        switch (true) {
            case funcRegex.test(line): {
                const start = 5 // "func ".length
                const { func, end } = readFuncName(start)

                result.funcs[`${pkg}.${func}`] = {
                    name: func,
                    range: {
                        start: { line: i, character: start },
                        end: { line: i, character: end },
                    },
                }
                break
            }
            case methodRegex.test(line): {
                const lparen = 5 // "func ".length
                let rparen = lparen

                for (const ch of line.substring(lparen).split('')) {
                    if (ch === ')') {
                        break
                    }
                    rparen++
                }

                let receiver = line.substring(lparen, rparen)
                receiver = receiver.split(' ')[1]
                if (!receiver) {
                    continue
                }

                const start = rparen + 2
                const { func, end } = readFuncName(start)

                result.funcs[`${pkg}.(${receiver}).${func}`] = {
                    name: func,
                    range: {
                        start: { line: i, character: start },
                        end: { line: i, character: end },
                    },
                    receiver: receiver,
                }
                break
            }
        }
    }

    return result
}
