#!/bin/bash

conda activate ecojupyter
pip install -ve .
jupyter labextension develop --overwrite .
sudo jupyter lab --allow-root