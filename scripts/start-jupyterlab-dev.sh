#!/bin/bash

# Name of the conda environment
ENV_NAME=ecojupyter

# Create the conda environment (don't use sudo)
conda create -y -n $ENV_NAME --override-channels --strict-channel-priority -c conda-forge -c nodefaults jupyterlab=4 nodejs=20 git copier=9 jinja2-time

# Ensure conda is initialized and activate the environment
# The following is needed for non-interactive shells
eval "$(conda shell.bash hook)"
conda activate $ENV_NAME

# The following commands are now run inside the conda environment

EXTENSION_NAME=ecojupyter
mkdir $EXTENSION_NAME
cd $EXTENSION_NAME
copier copy --trust https://github.com/jupyterlab/extension-template .

pip install -ve .
jupyter labextension develop --overwrite .
