#!/usr/bin/env bash
# Parallel version of pcn_cora.sh: spreads seeds 0..9 across the listed GPUs.
# Override the GPU list with: GPUS=2,3,4 bash experiments/scripts/pcn_cora_parallel.sh
set -euo pipefail

GPUS="${GPUS:-2,3,4,5,6,7}"
LOG_DIR="${LOG_DIR:-experiments/results/Cora/parallel_logs}"

python -m tools.parallel_seeds \
  --gpus "${GPUS}" \
  --start_seed 0 \
  --stop_seed 9 \
  --log_dir "${LOG_DIR}" \
  -- \
  --task_type link_prediction \
  --eval_metric auc \
  --dataset Cora \
  --model link_prediction_pcn \
  --complex_type path \
  --max_dim 2 \
  --num_layers 2 \
  --emb_dim 64 \
  --batch_size 1 \
  --epochs 200 \
  --lr 0.01 \
  --lr_scheduler ReduceLROnPlateau \
  --lr_scheduler_patience 20 \
  --lr_scheduler_min 0.00001 \
  --drop_rate 0.3 \
  --nonlinearity relu \
  --graph_norm bn \
  --use_coboundaries False \
  --use_boundaries False \
  --init_method sum \
  --train_eval_period 10 \
  --val_ratio 0.05 \
  --test_ratio 0.10 \
  --neg_sampling_ratio 1.0 \
  --decoder_type dot \
  --num_layers_update 2 \
  --num_layers_combine 1 \
  --conv_type B \
  --early_stop \
  --exp_name pcn_cora_link_prediction
