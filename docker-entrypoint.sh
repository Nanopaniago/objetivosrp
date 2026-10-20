#!/bin/sh
# Make sure the data folder (often a bind mount created by root) is writable,
# then drop privileges and run the app as the unprivileged "node" user.
set -e
if [ "$(id -u)" = "0" ]; then
  mkdir -p "${DATA_DIR:-/data}"
  chown -R node:node "${DATA_DIR:-/data}"
  exec su-exec node "$@"
fi
exec "$@"
