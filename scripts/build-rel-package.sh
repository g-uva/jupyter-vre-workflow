#!/bin/bash

set -e  # Exit on error

while [[ "$#" -gt 0 ]]; do
    case $1 in
        -m|--message)
            COMMIT_MSG="$2"
            shift 2
            ;;
        *)
            echo "Unknown parameter passed: $1"
            echo "Usage: $0 -m|--message \"Commit message\""
            exit 1
            ;;
    esac
done

if [ -z "$COMMIT_MSG" ]; then
    echo "Error: Commit message is required."
    echo "Usage: $0 -m|--message \"Your commit message\""
    exit 1
fi

# Install conda if not found
if ! command -v conda &> /dev/null; then
    if [ -d "$HOME/miniconda3/bin" ]; then
        echo "Miniconda directory found, adding to PATH..."
        export PATH="$HOME/miniconda3/bin:$PATH"
    else
        echo "conda not found. Installing Miniconda..."
        MINICONDA_URL="https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh"
        curl -fsSL "$MINICONDA_URL" -o /tmp/miniconda.sh
        bash /tmp/miniconda.sh -b -p "$HOME/miniconda3"
        rm /tmp/miniconda.sh
        export PATH="$HOME/miniconda3/bin:$PATH"
        echo "Miniconda installed."
    fi
fi

# Activate conda env
CONDA_BASE=$(conda info --base)
source "$CONDA_BASE/etc/profile.d/conda.sh"
if ! conda info --envs | grep -q "^jupyter-vre-workflow"; then
    echo "Conda environment 'jupyter-vre-workflow' not found. Creating..."
    conda create -y -n jupyter-vre-workflow --override-channels --strict-channel-priority -c conda-forge -c nodefaults jupyterlab=4 nodejs=20 git
    echo "Conda environment 'jupyter-vre-workflow' created."
fi
conda activate jupyter-vre-workflow
echo "Conda environment 'jupyter-vre-workflow' activated."

# Auto-increment version in package.json
echo "Bumping package.json version..."
PACKAGE_JSON="package.json"

# Bump patch version using jq
if command -v jq &> /dev/null; then
    current_version=$(jq -r .version "$PACKAGE_JSON")
    IFS='.' read -r major minor patch <<< "$current_version"
    new_version="${major}.${minor}.$((patch + 1))"
    jq ".version = \"$new_version\"" "$PACKAGE_JSON" > tmp.json && mv tmp.json "$PACKAGE_JSON"
    echo "Updated version to $new_version in $PACKAGE_JSON"
else
    echo "ERROR: jq not found. Please install jq to auto-bump version."
    exit 1
fi

# Extract version using grep and sed
version=$(grep '"version":' package.json | head -1 | sed -E 's/.*"version": *"([^"]+)".*/\1/')
echo "Pushing current version $version"

# Rebuild the prebuilt frontend after the version bump. The Python build hook
# intentionally skips this step when an existing bundle is present.
echo "Building the prebuilt JupyterLab extension..."
npm run build:prod

# Clean old builds
echo "Cleaning previous builds..."
rm -rf dist/ build/ *.egg-info

# Build the package
echo "Building the package..."
BUILD_ENV=$(mktemp -d "${TMPDIR:-/tmp}/jupyter-vre-workflow-build.XXXXXX")
cleanup_build_env() {
    if command -v deactivate &> /dev/null; then
        deactivate
    fi
    if [[ -n "${BUILD_ENV:-}" && -d "$BUILD_ENV" ]]; then
        rm -rf -- "$BUILD_ENV"
    fi
}
trap cleanup_build_env EXIT

python3 -m venv "$BUILD_ENV"
source "$BUILD_ENV/bin/activate"
python -m pip install build twine
python -m build
python -m twine check dist/*

# Only create release state after both distributions validate.
git commit -am "Bump version to $version - $COMMIT_MSG"
git tag "v$version"
git push origin "v$version"

# Load credentials only immediately before upload; never print the token.
export TWINE_PASSWORD=$(grep '^PYPI_TOKEN=' .env | cut -d '=' -f2- | tr -d '"')

# Upload to PyPI
echo "Uploading the package to PyPI..."
export TWINE_USERNAME="__token__"
python -m twine upload dist/*

echo "Package uploaded successfully."
echo "Cleaning up build environment..."
cleanup_build_env
trap - EXIT
echo "Build environment cleaned up."
echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
echo "DONE :)"
