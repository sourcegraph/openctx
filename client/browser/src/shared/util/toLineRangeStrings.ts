/**
 * Converts arrays of line numbers like [1,2,3,5,6,9] to ["1-3", "5-6", "9"].
 */
export function toLineRangeStrings(lines: number[]): string[] {
    const lineRanges: string[] = []

    let startLine: number | null = null

    for (const [i, line] of lines.entries()) {
        if (startLine === null) {
            // Start of first range.
            startLine = line
            continue
        }

        const prevLine = i > 0 ? lines[i - 1] : null
        if (prevLine !== null) {
            if (line === prevLine + 1) {
                // Continuation of current range.
                continue
            }

            // End of current range, start of a new range.
            lineRanges.push(lineRangeString(startLine, prevLine))
            startLine = line
            continue
        }
    }

    // Unfinished range at the end of the file.
    if (startLine !== null) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        lineRanges.push(lineRangeString(startLine, lines.at(-1)!))
    }

    return lineRanges
}

function lineRangeString(start: number, end: number): string {
    return start === end ? `${start}` : `${start}-${end}`
}
