#!/usr/bin/env bash
# Debug-APK-Build mit JDK 21, wenn der Alpha-Symlink vorhanden ist.
# System-JDK 17/27 scheitern an AGP 8 / Java-Quellniveau 21.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
preferred="${JAVA_HOME_OVERRIDE:-$HOME/.local/share/jvm/jdk-21}"
if [[ -x "$preferred/bin/java" ]]; then
  export JAVA_HOME="$preferred"
fi
if ! command -v java >/dev/null && [[ ! -x "${JAVA_HOME:-}/bin/java" ]]; then
  echo "build-android: kein Java gefunden (erwarte JDK 21 unter $preferred oder JAVA_HOME)." >&2
  exit 1
fi
cd "$root"
pnpm run native:sync
cd android
exec ./gradlew assembleDebug "$@"
