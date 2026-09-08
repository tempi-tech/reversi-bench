#!/bin/sh
set -eu
arena=__ARENA__
side=__SIDE__
invalid() {
  printf '%s\n' '{"ok":false,"error":"usage: ./referee wait | ./referee play <coord> [--win P --draw P --loss P]"}'
  exit 1
}
case "${1:-}" in
  wait)
    test "$#" -eq 1 || invalid
    exec node "$arena/reversi.mjs" wait --as "$side" --id current --timeout 120 --json
    ;;
  play)
    if test "$#" -eq 2; then
      exec node "$arena/reversi.mjs" play "$2" --as "$side" --id current --json
    fi
    test "$#" -eq 8 || invalid
    test "$3" = --win && test "$5" = --draw && test "$7" = --loss || invalid
    exec node "$arena/reversi.mjs" play "$2" --win "$4" --draw "$6" --loss "$8" --as "$side" --id current --json
    ;;
  *) invalid ;;
esac
