#!/usr/bin/env bash
set -euo pipefail

# Run against this checkout, even when invoked from another directory.
PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

SETUP_ONLY=false
if [[ "${1:-}" == "--setup-only" ]]; then
    SETUP_ONLY=true
    shift
fi

if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
    echo "Node.js 20+ and npm are required. Install them, then rerun this script." >&2
    exit 1
fi
if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 20 ? 0 : 1)'; then
    echo "Node.js 20+ is required." >&2
    exit 1
fi

if [[ ! -x .venv/bin/python ]]; then
    python3 -m venv .venv
fi
# Set these explicitly: activation scripts can contain a stale checkout path.
export VIRTUAL_ENV="$PROJECT_DIR/.venv"
export PATH="$VIRTUAL_ENV/bin:$PATH"
PYTHON="$VIRTUAL_ENV/bin/python"

"$PYTHON" -m pip install 'jupyterlab>=4,<5'
npm ci --no-audit --no-fund
node node_modules/typescript/bin/tsc --sourceMap
CORE_PATH="$("$PYTHON" -c 'import pathlib, jupyterlab; print(pathlib.Path(jupyterlab.__file__).parent / "staging")')"
BUILDER="$PROJECT_DIR/node_modules/@jupyterlab/builder/lib/build-labextension.js"
node "$BUILDER" --development --core-path "$CORE_PATH" .
# A moved checkout may leave a dangling development link that blocks pip's writes.
"$PYTHON" - <<'PY'
import pathlib
import sys

link = pathlib.Path(sys.prefix) / 'share/jupyter/labextensions/jupyter-vre-workflow'
if link.is_symlink() and not link.exists():
    link.unlink()
PY
SKIP_JUPYTER_BUILDER=1 "$PYTHON" -m pip install -e .

# Call Python directly so relocated .venv console-script shebangs do not break startup.
"$PYTHON" - <<'PY'
try:
    from jupyter_builder.federated_extensions import develop_labextension
except ImportError:
    from jupyterlab.federated_labextensions import develop_labextension

develop_labextension('jupyter_vre_workflow/labextension', destination='jupyter-vre-workflow',
                     sys_prefix=True, overwrite=True)
PY

if "$SETUP_ONLY"; then
    echo "Development setup complete in $VIRTUAL_ENV."
    exit 0
fi

pids=()
cleanup() {
    trap - EXIT
    if ((${#pids[@]})); then
        kill "${pids[@]}" 2>/dev/null || true
        wait "${pids[@]}" 2>/dev/null || true
    fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

node node_modules/typescript/bin/tsc --watch --sourceMap &
pids+=("$!")
node "$BUILDER" --development --core-path "$CORE_PATH" --watch . &
pids+=("$!")
"$PYTHON" -m jupyterlab "$@" &
pids+=("$!")

# Stop the remaining processes when the server or either watcher exits.
wait -n "${pids[@]}"
