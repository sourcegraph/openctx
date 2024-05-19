#!/bin/bash

# This is an end-to-end test that checks for common failures from using JavaScript module providers
# in VS Code. This is tricky because VS Code's extension host does not support import()ing, so we
# need to rewrite to CommonJS and require. See https://github.com/microsoft/vscode/issues/130367.

set -eu

MY_DIR=$(cd $(dirname $0) > /dev/null; pwd)
VSCODE_EXT_DIR=$(realpath "$MY_DIR"/..)
cd "$VSCODE_EXT_DIR" > /dev/null

VSCODE_VERSION=$(grep -Eo 'version: (.+),' "$VSCODE_EXT_DIR"/test/integration/main.cts | sed "s/version: '//" | sed "s/',//")
VSCODE_BIN=$(realpath .vscode-test/vscode-*-$VSCODE_VERSION/bin/code)

RELEASE_TYPE=pre pnpm run release:dry-run
VSIX_FILE="$VSCODE_EXT_DIR"/dist/openctx.vsix

TMPDIR=$(mktemp -d)
function cleanup() {
	sleep 0.25
	rm -rf "$TMPDIR"
}
trap cleanup EXIT

USER_DATA_DIR="$TMPDIR"/vscode-user-data-dir
WORKSPACE_DIR="$TMPDIR"/vscode-workspace
mkdir -p "$WORKSPACE_DIR"

export OPENCTX_VSCODE_INTEGRATION_TEST_TMP_SCRATCH_DIR="$TMPDIR"/scratch
mkdir -p "$OPENCTX_VSCODE_INTEGRATION_TEST_TMP_SCRATCH_DIR"

VSCODE_ARGS="--user-data-dir $USER_DATA_DIR --profile openctx-integration-test --no-sandbox --disable-gpu-sandbox --skip-release-notes --skip-welcome --disable-telemetry --disable-updates --disable-workspace-trust --sync off"

HELLO_PATH="$WORKSPACE_DIR"/hello.txt
echo "Hello, world" > "$HELLO_PATH"

# Open VS Code.
"$VSCODE_BIN" $VSCODE_ARGS --new-window --extensionTestsPath="$VSCODE_EXT_DIR"/dist/tsc/test/integration/index.cjs "$WORKSPACE_DIR"
"$VSCODE_BIN" $VSCODE_ARGS --reuse-window "$HELLO_PATH"


# Set the workspace settings.
mkdir -p "$WORKSPACE_DIR"/.vscode
PROVIDER_URI_PREFIX="file://"$(realpath "$VSCODE_EXT_DIR"/../../lib/client/src/providerClient/transport/testdata/)
echo '{"openctx.enable":true,"openctx.debug":true,"openctx.providers":{' '"'$PROVIDER_URI_PREFIX/{commonjsExtProvider.cjs,commonjsProvider.js,esmExtProvider.mjs,esmProvider.js}'"':true, '}}' > "$WORKSPACE_DIR"/.vscode/settings.json

# Install the extension (after polling to see when the new VS Code profile is ready).
while true; do
	"$VSCODE_BIN" $VSCODE_ARGS --list-extensions > /dev/null 2>&1 && break
	sleep 0.25
done
"$VSCODE_BIN" $VSCODE_ARGS --install-extension "$VSIX_FILE"


# Tail the "OpenCtx" output channel.
while true; do
	OUTPUT_CHANNEL_FILE=$(find "$USER_DATA_DIR"/logs -name '*-OpenCtx.log')
	[ -n "$OUTPUT_CHANNEL_FILE" ] && break
	sleep 0.5
done
echo "# OpenCtx output channel: $OUTPUT_CHANNEL_FILE"
tail --quiet -f "$OUTPUT_CHANNEL_FILE" &

# Other logs:
#tail --quiet -f $(find "$USER_DATA_DIR"/logs -name renderer.log) &
#tail --quiet -f $(find "$USER_DATA_DIR"/logs -name exthost.log) &

if [ -n "${CI-}" ]; then
	sleep 20
else
	sleep 5
fi

# Tests
if grep -q 'failed to get provider meta' "$OUTPUT_CHANNEL_FILE"; then
	echo 'FAIL - saw failures in the output'
	exit 1
fi
if ! grep -q 'received meta' "$OUTPUT_CHANNEL_FILE"; then
	echo 'FAIL - did not see any "received meta" messages in the output'
	exit 1
fi
echo PASS
exit 0