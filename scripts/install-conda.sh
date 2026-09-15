#!/bin/bash

conda activate jupyter-vre-workflow
python -m pip install -ve .
jupyter labextension develop --overwrite .
python -m jupyterlab
