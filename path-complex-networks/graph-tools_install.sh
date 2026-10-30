#!/usr/bin/env bash

# Initialize conda for this script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/miniconda3/etc/profile.d/conda.sh"

conda create -n pcn python=3.11 -y
conda activate pcn
conda install -c conda-forge -y graph-tool==2.45
