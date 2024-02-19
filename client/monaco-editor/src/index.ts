import { type Annotation, type Client, type Range } from '@opencodegraph/client'
import * as monaco from 'monaco-editor'

/**
 * Like {@link monaco.Range}, but also overlaps with {@link Range}.
 */
class MonacoRange extends monaco.Range {
    constructor(startLineNumber: number, startColumn: number, endLineNumber: number, endColumn: number) {
        super(startLineNumber + 1, startColumn + 1, endLineNumber + 1, endColumn + 1)
    }

    public get start(): MonacoPosition {
        return new MonacoPosition(this.getStartPosition())
    }

    public get end(): MonacoPosition {
        return new MonacoPosition(this.getEndPosition())
    }
}

/**
 * Like {@link monaco.Position}, but also overlaps with {@link Position}.
 */
class MonacoPosition extends monaco.Position {
    constructor(position: monaco.Position) {
        super(position.lineNumber + 1, position.column + 1)
    }

    public get line(): number {
        return this.lineNumber
    }
    public get character(): number {
        return this.column
    }
}

/**
 * Convert a {@link Range} to a range that can be used with the Monaco editor
 * ({@link monaco.Range}).
 *
 * Use it in {@link import('@opencodegraph/client').createClient}'s `makeRange` environment field.
 */
export function makeRange(range: Range): MonacoRange {
    return new MonacoRange(range.start.line, range.start.character, range.end.line, range.end.character)
}

const OPEN_URL_COMMAND = 'opencodegraph.openUrl'

/**
 * A Monaco extension is activated by calling it with the editor as an argument. Calling its
 * returned disposable deactivates the extension.
 */
export type MonacoExtension = (editor: monaco.editor.IStandaloneCodeEditor) => monaco.IDisposable

export function createExtension(client: Client<MonacoRange>): MonacoExtension {
    return (editor: monaco.editor.IStandaloneCodeEditor): monaco.IDisposable => {
        const disposables: monaco.IDisposable[] = []

        disposables.push(
            monaco.editor.registerCommand(OPEN_URL_COMMAND, (_accessor: unknown, url: string | monaco.Uri) => {
                window.open(url.toString(), '_blank')
            })
        )

        disposables.push(
            monaco.languages.registerCodeLensProvider(['*'], {
                provideCodeLenses: async model => {
                    if (editor.getModel() !== model) {
                        return null
                    }

                    // TODO(sqs): don't only get first value
                    const anns = await client.annotations({ file: model.uri.toString(), content: model.getValue() })

                    return {
                        lenses: anns.map(toCodeLens),
                        dispose: () => {},
                    }
                },
            })
        )

        return {
            dispose(): void {
                for (const disposable of disposables) {
                    disposable.dispose()
                }
            },
        }
    }
}

function toCodeLens(ann: Annotation<MonacoRange>): monaco.languages.CodeLens {
    return {
        command: {
            title: ann.item.title,
            tooltip: ann.item.detail,
            ...(ann.item.url
                ? {
                      id: OPEN_URL_COMMAND,
                      arguments: [ann.item.url],
                  }
                : { id: 'noop' }),
        },
        range: ann.range,
    }
}
