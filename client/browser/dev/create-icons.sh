#!/usr/bin/env bash

set -eu
INIT_CWD=$PWD
cd "$(dirname "${BASH_SOURCE[0]}")" > /dev/null

INPUT_SVG=../../../web/public/logomark-v0.svg

SIZES=(
	32
	48
	128
)
for size in "${SIZES[@]}"; do
	out=$(realpath ../public/icon-${size}.png)
	pnpx svgexport@0.4.2 "$INPUT_SVG" "$out" png 100% ${size}:${size}
	echo ${out/$INIT_CWD\//}
done
