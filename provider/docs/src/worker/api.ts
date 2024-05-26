export interface WorkerMessagePair<
    T extends string = string,
    A extends {} = Record<never, never>,
    R extends {} = Record<never, never>,
> {
    type: T
    request: { id: number; type: T; args: A }
    response: { id: number; result: R }
}

export interface WorkerEmbedTextMessage extends WorkerMessagePair<'embedText', string, Float32Array> {}
