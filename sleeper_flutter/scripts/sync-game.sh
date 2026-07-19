#!/usr/bin/env sh
# Refresh the bundled game from the canonical copy at public/athlete/.
# Run from anywhere; paths resolve relative to this script.
set -e
here="$(cd "$(dirname "$0")" && pwd)"
src="$here/../../public/athlete"
dst="$here/../assets/www"
rm -rf "$dst"
mkdir -p "$dst"
cp -R "$src"/. "$dst"/
echo "Copied $(find "$dst" -type f | wc -l | tr -d ' ') files into assets/www"
