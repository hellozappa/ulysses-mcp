#!/bin/bash
set -euo pipefail
task_root="$(cd "$(dirname "$0")/.." && pwd)"
task_bundle="$task_root/build/UlyssesMCPHelper.app"
mkdir -p "$task_bundle/Contents/MacOS"
swiftc "$task_root/helper-app/UlyssesMCPHelper.swift" -o "$task_bundle/Contents/MacOS/UlyssesMCPHelper" -framework AppKit
cp "$task_root/helper-app/Info.plist" "$task_bundle/Contents/Info.plist"
# Deliberately does not register the URL scheme or launch the app.
