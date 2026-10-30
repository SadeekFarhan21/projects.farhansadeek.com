"""Run `tools.train_eval` once per seed, pinning each seed to a GPU.

Usage:
    python -m tools.parallel_seeds \
        --gpus 2,3,4,5,6,7 \
        --start_seed 0 --stop_seed 9 \
        -- \
        --task_type link_prediction --dataset Cora --model link_prediction_pcn ...

Everything after the ``--`` separator is forwarded verbatim to
``tools.train_eval`` (minus ``--start_seed``/``--stop_seed``/``--device`` which
the launcher manages). Seeds are queued onto the provided GPUs with one
subprocess per GPU; when a process finishes its slot gets the next seed.
"""
import argparse
import os
import subprocess
import sys
import time
from collections import deque


def parse_launcher_args(argv):
    try:
        split = argv.index('--')
    except ValueError:
        raise SystemExit(
            "parallel_seeds: expected '--' separator before train_eval args")

    launcher_argv, passthrough = argv[:split], argv[split + 1:]

    parser = argparse.ArgumentParser(description="Parallel seed launcher")
    parser.add_argument('--gpus', type=str, required=True,
                        help='Comma-separated CUDA device ids (e.g. 2,3,4,5,6,7)')
    parser.add_argument('--start_seed', type=int, required=True)
    parser.add_argument('--stop_seed', type=int, required=True)
    parser.add_argument('--log_dir', type=str, default=None,
                        help='If set, per-seed stdout/stderr is written here '
                             'instead of streaming to the terminal.')
    parser.add_argument('--poll_interval', type=float, default=1.0)
    args = parser.parse_args(launcher_argv)

    gpu_ids = [g.strip() for g in args.gpus.split(',') if g.strip()]
    if not gpu_ids:
        raise SystemExit("parallel_seeds: --gpus produced an empty list")
    if args.stop_seed < args.start_seed:
        raise SystemExit("parallel_seeds: stop_seed must be >= start_seed")

    # Forwarded args must not contain launcher-managed flags.
    banned = {'--start_seed', '--stop_seed', '--device'}
    for flag in banned:
        if flag in passthrough:
            raise SystemExit(
                f"parallel_seeds: do not pass {flag} through to train_eval; "
                "the launcher sets it per seed.")

    return args, gpu_ids, passthrough


def launch_one(seed, gpu_id, passthrough, log_dir):
    env = os.environ.copy()
    env['CUDA_VISIBLE_DEVICES'] = gpu_id

    cmd = [
        sys.executable, '-m', 'tools.train_eval',
        '--start_seed', str(seed),
        '--stop_seed', str(seed),
        '--device', '0',  # physical gpu_id is masked to 0 by CUDA_VISIBLE_DEVICES
        *passthrough,
    ]

    stdout = stderr = None
    log_handle = None
    if log_dir is not None:
        os.makedirs(log_dir, exist_ok=True)
        log_path = os.path.join(log_dir, f'seed_{seed}.log')
        log_handle = open(log_path, 'w', buffering=1)
        stdout = stderr = log_handle

    print(f"[launcher] seed={seed} -> GPU {gpu_id} (pid pending) cmd={' '.join(cmd)}",
          flush=True)
    proc = subprocess.Popen(cmd, env=env, stdout=stdout, stderr=stderr)
    return proc, log_handle


def main():
    args, gpu_ids, passthrough = parse_launcher_args(sys.argv[1:])

    pending = deque(range(args.start_seed, args.stop_seed + 1))
    free_gpus = deque(gpu_ids)
    running = {}  # pid -> (seed, gpu_id, proc, log_handle)
    failures = []

    while pending or running:
        while pending and free_gpus:
            seed = pending.popleft()
            gpu_id = free_gpus.popleft()
            proc, log_handle = launch_one(seed, gpu_id, passthrough, args.log_dir)
            running[proc.pid] = (seed, gpu_id, proc, log_handle)

        time.sleep(args.poll_interval)

        for pid in list(running):
            seed, gpu_id, proc, log_handle = running[pid]
            rc = proc.poll()
            if rc is None:
                continue
            if log_handle is not None:
                log_handle.close()
            status = 'ok' if rc == 0 else f'FAIL (rc={rc})'
            print(f"[launcher] seed={seed} GPU={gpu_id} pid={pid} -> {status}",
                  flush=True)
            if rc != 0:
                failures.append((seed, gpu_id, rc))
            free_gpus.append(gpu_id)
            del running[pid]

    if failures:
        print(f"[launcher] {len(failures)} seed(s) failed: {failures}",
              file=sys.stderr, flush=True)
        sys.exit(1)
    print("[launcher] all seeds completed successfully", flush=True)


if __name__ == '__main__':
    main()
