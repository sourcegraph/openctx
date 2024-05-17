import * as path from 'path'
import { globSync } from 'glob'
import Mocha from 'mocha'

export async function run(): Promise<void> {
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 15000,
        grep: process.env.TEST_PATTERN ? new RegExp(process.env.TEST_PATTERN, 'i') : undefined,
    })

    const testsRoot = __dirname

    const files = globSync('**/**.test.cjs', { cwd: testsRoot })

    // Add files to the test suite
    for (const file of files) {
        mocha.addFile(path.resolve(testsRoot, file))
    }

    try {
        // Run the mocha test
        return await new Promise((resolve, reject) =>
            mocha.run(failures => {
                if (failures > 0) {
                    reject(new Error(`${failures} tests failed.`))
                }
                resolve()
            })
        )
    } catch (error) {
        console.error(error)
    }
}
