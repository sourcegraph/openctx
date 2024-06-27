import * as vscode from 'vscode'

// dynamic imports don't work in node + vscode due to
// https://github.com/microsoft/vscode-loader/issues/36
//
// So vscode-lib sets a global so providers can optionally access vscode APIs.

interface Global {
    openctx?: {
        vscode?: typeof vscode
    }
}

export function initializeOpenCtxGlobal() {
    initializeGlobal(global as Global)
}

function initializeGlobal(global: Global) {
    if (!global.openctx) {
        global.openctx = { vscode }
    }
    global.openctx.vscode = vscode
}
