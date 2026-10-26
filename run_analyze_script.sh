#!/bin/bash
set -e

sudo apt-get update && sudo apt-get install -y gnuplot

npm install
npm run build

rm -f results.md

for bench in 1 2 3; do
    echo "Processing files for bench${bench}:"
    files=(bench${bench}_*.txt)
    if [[ -e "${files[0]}" ]]; then
        cmd="node dist/analyze.js ${files[*]}"
        echo "Running command: $cmd"
        $cmd
    else
        echo "Warning: No files found for bench${bench}"
    fi
done
