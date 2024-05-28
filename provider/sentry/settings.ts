/** Settings for the Sentry provider. */
export type Settings = {
    /** Path to the API token. Will be read from the file. */
    apiTokenPath?: string
    /** Inline definition of the API token. */
    apiToken?: string
}
