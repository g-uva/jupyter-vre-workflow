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

# Activate conda env
CONDA_BASE=$(conda info --base)
source "$CONDA_BASE/etc/profile.d/conda.sh"
conda activate ecojupyter
echo "Conda environment 'ecojupyter' activated."

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

git commit -am "Bump version to $version - $COMMIT_MSG"

# Create a new tag
git tag "v$version"
# Push the new tag to the remote repository
git push origin "v$version"
# Check if the tag push was successful
if [ $? -eq 0 ]; then
    echo "Successfully pushed tag v$version"
else
    echo "Failed to push tag v$version"
    exit 1
fi

# Load the PYPI_TOKEN from .env (assumes "PYPI_TOKEN=\"tokenvalue\"" format)
export PYPI_TOKEN=$(grep '^PYPI_TOKEN=' .env | cut -d '=' -f2- | tr -d '"')

# Clean old builds
echo "Cleaning previous builds..."
rm -rf dist/ build/ *.egg-info

# Build the package
echo "Building the package..."
python3 -m venv build-env
source build-env/bin/activate
pip install build
python3 -m build -s

# Upload to PyPI
echo "Uploading the package to PyPI..."
python3 -m pip install --upgrade twine
export TWINE_USERNAME="__token__"
export TWINE_PASSWORD=$PYPI_TOKEN
python3 -m twine upload dist/*

echo "Package uploaded successfully."
echo "Cleaning up build environment..."
deactivate
rm -rf build-env
echo "Build environment cleaned up."
echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
echo "DONE :)"
