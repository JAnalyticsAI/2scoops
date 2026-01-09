#!/usr/bin/env bash
# Generate a 30x30 PNG from icecream.svg using ImageMagick
# Install ImageMagick (macOS): brew install imagemagick
# Usage: ./make_icecream_png.sh

set -euo pipefail

SVG=icecream.svg
OUT=icecream_30.png

if ! command -v convert >/dev/null 2>&1; then
  echo "ImageMagick 'convert' not found. Install it (macOS: brew install imagemagick)" >&2
  exit 1
fi

if [ ! -f "$SVG" ]; then
  echo "SVG file '$SVG' not found in current directory." >&2
  exit 1
fi

convert "$SVG" -background none -resize 30x30 "$OUT"
echo "Wrote $OUT"
