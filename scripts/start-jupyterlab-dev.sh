#!/bin/bash
ENV_NAME="ecojupyter3"
conda create -n $ENV_NAME --override-channels --strict-channel-priority -c conda-forge -c nodefaults jupyterlab=4 nodejs=20 git copier=9 jinja2-time
conda activate $ENV_NAME

EXTENSION_NAME="ecojupyter"
mkdir $EXTENSION_NAME
cd $EXTENSION_NAME
copier copy --trust https://github.com/jupyterlab/extension-template .

cd ..

pip install -ve .
jupyter labextension develop . --overwrite

