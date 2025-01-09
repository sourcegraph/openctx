import { describe, test } from 'vitest'
import proxy from './index.js'
const Ajv = require("ajv");
describe('Module exports', () => {


    // test('exports expected type definitions', async () => {
    //     // We can't directly test types at runtime, but we can verify the exports exist
    //     console.log("testing")
    //     const client = await proxy.meta!( { 'mcp.provider.uri': 'file://dist/index.js' , 'mcp.provider.args': []  })
    //     console.log(client)
    //     const mentions = await proxy.mentions!({ query: '' }, {})
    //     console.log(mentions)

    //     const inputSchemaString = `{
    //       "inputSchema": {
    //         "type": "object",
    //         "properties": {
    //           "prompt": {
    //             "type": "string",
    //             "description": "The prompt to send to the LLM"
    //           },
    //           "maxTokens": {
    //             "type": "number",
    //             "default": 100,
    //             "description": "Maximum number of tokens to generate"
    //           }
    //         },
    //         "required": [
    //           "prompt"
    //         ],
    //         "additionalProperties": false,
    //         "$schema": "http://json-schema.org/draft-07/schema#"
    //       }
    //     }`
    //     const ajv = new Ajv();

    //     // Parse the schema string to JSON
    //     const inputSchema = JSON.parse(inputSchemaString).inputSchema;

    //     // Example valid input
    //     const validInput = {
    //         prompt: "Hello, how are you?",
    //         maxTokens: 50
    //     };

    //     // Example invalid input
    //     const invalidInput = {
    //         maxTokens: 50
    //         // missing required 'prompt'
    //     };

    //     try {
    //         // Validate valid input
    //         const isValidInput = ajv.validate(inputSchema, validInput);
    //         console.log('Valid input:', isValidInput, validInput);

    //         // Try to validate invalid input
    //         const isInvalidInput = ajv.validate(inputSchema, invalidInput);
    //         console.log('Invalid input result:', isInvalidInput, ajv.errors);
    //     } catch (error) {
    //         console.log('Validation error:', error);
    //     }

    //     // While we can't test types directly, we can verify the module has exports
    //     // expect(mentions.length).toBeGreaterThan(0)
    // })

    test('exports me type definitions', async () => {
        // We can't directly test types at runtime, but we can verify the exports exist
        const client = await proxy.meta!( { 'mcp.provider.uri': 'file:///Users/arafatkhan/Desktop/servers/src/everything/dist/index.js' , 'mcp.provider.args': []  })
        console.log(client)
        const inputs = await proxy.mentions!({ query: 'add' }, {})
        const inputSchema = JSON.parse((inputs[0] as any).inputSchema)
        console.log(inputSchema)
        const ajv = new Ajv();
        const validInput = {
            a: 2,
            b: 3
        };
        const isValidInput = ajv.validate(inputSchema, validInput);
        console.log('Valid input:', isValidInput, validInput);

        const items = await proxy.items!({ mention: { uri: 'test', title: 'echo', data: { message: 'hello' } } }, {})
        console.log(items)


        // While we can't test types directly, we can verify the module has exports
        // expect(mentions.length).toBeGreaterThan(0)
    })
})