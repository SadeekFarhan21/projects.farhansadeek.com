import torch
import numpy as np

from lib.helpers.criterion import get_criterion
from lib.helpers.evaluator import Evaluator
from lib.helpers.save_helpers import get_checkpoint_state, save_checkpoint, load_checkpoint
from lib.utils.log_utils import args_to_string
from lib.helpers.model_helpers import compute_params

from tqdm import tqdm
import os
import wandb


class LinkPredictionTrainer(object):
    """Trainer for link prediction tasks on single-graph datasets."""

    def __init__(self, model, args, lp_dataset, optimizer, scheduler,
                 result_folder, train_seed, device):
        self.model = model
        self.args = args
        self.lp_dataset = lp_dataset
        self.optimizer = optimizer
        self.scheduler = scheduler
        self.train_seed = train_seed if train_seed is not None else 0
        self.device = device
        self.loss_fn = get_criterion('link_prediction')

        # Move data to device
        self.lp_dataset.to(device)

        # Set up evaluator
        self.evaluator = Evaluator(self.args.eval_metric)

        if not args.eval_only:
            self.best_val_epoch = 0
            self.valid_curve = []
            self.test_curve = []
            self.train_curve = []
            self.train_loss_curve = []

            if not self.args.debug:
                new_folder = os.path.join(result_folder, f'seed_{self.train_seed}')
                self.filename = os.path.join(new_folder, f'results-seed_{self.train_seed}.txt')
                if not os.path.exists(new_folder):
                    os.makedirs(new_folder)
                self.best_epoch_pt = os.path.join(new_folder, 'best_weights.pt')

            print("==========================================================")
            print("Using device", str(device))
            print(f"Random Seed: {args.seed}")
            print(f"Train Seed: {self.train_seed}")
            print("======================== Args ===========================")
            print(args)
            print("=========================================================")

            compute_params(model)

    def train_one_epoch(self):
        self.model.train()
        self.optimizer.zero_grad()

        data = self.lp_dataset.complex
        edge_label_index = self.lp_dataset.train_edge_label_index
        edge_label = self.lp_dataset.train_edge_label.float()

        pred = self.model(data, edge_label_index)
        loss = self.loss_fn(pred, edge_label)

        loss.backward()
        self.optimizer.step()

        return loss.detach().cpu().item()

    @torch.no_grad()
    def eval(self, split='val'):
        self.model.eval()
        data = self.lp_dataset.complex

        if split == 'train':
            edge_label_index = self.lp_dataset.train_edge_label_index
            edge_label = self.lp_dataset.train_edge_label
        elif split == 'val':
            edge_label_index = self.lp_dataset.val_edge_label_index
            edge_label = self.lp_dataset.val_edge_label
        elif split == 'test':
            edge_label_index = self.lp_dataset.test_edge_label_index
            edge_label = self.lp_dataset.test_edge_label
        else:
            raise ValueError(f"Unknown split: {split}")

        pred = self.model(data, edge_label_index)
        loss = self.loss_fn(pred, edge_label.float())

        y_pred = pred.sigmoid().cpu().numpy()
        y_true = edge_label.cpu().numpy()

        input_dict = {'y_pred': y_pred, 'y_true': y_true}
        perf = self.evaluator.eval(input_dict)

        return perf, loss.cpu().item()

    def train(self):
        best_val_epoch = 0
        valid_curve = []
        test_curve = []
        train_curve = []

        suffix = f'(Seed {self.train_seed})'

        for epoch in range(1, self.args.epochs + 1):
            log_dict = {}
            print("=====Epoch {}".format(epoch))

            np.random.seed(np.random.get_state()[1][0] + epoch)

            print('Training...')
            epoch_train_loss = self.train_one_epoch()

            print('Evaluating...')
            if epoch == 1 or epoch % self.args.train_eval_period == 0:
                train_perf, _ = self.eval('train')

            valid_perf, epoch_val_loss = self.eval('val')
            test_perf, epoch_test_loss = self.eval('test')

            train_curve.append(train_perf)
            valid_curve.append(valid_perf)
            test_curve.append(test_perf)

            print(f'Train: {train_perf:.4f} | Validation: {valid_perf:.4f} | Test: {test_perf:.4f}'
                  f' | Train Loss {epoch_train_loss:.4f} | Val Loss {epoch_val_loss:.4f}'
                  f' | Test Loss {epoch_test_loss:.4f}')

            # Learning rate scheduling
            if self.scheduler is not None:
                if self.args.lr_scheduler == 'ReduceLROnPlateau':
                    self.scheduler.step(valid_perf)
                    if self.args.early_stop and self.optimizer.param_groups[0]['lr'] < self.args.lr_scheduler_min:
                        print("\n!! The minimum learning rate has been reached.")
                        break
                else:
                    self.scheduler.step()

            perf_curves = (train_perf, valid_perf, test_perf)
            loss_curves = (epoch_train_loss, epoch_val_loss, epoch_test_loss)

            if not self.args.debug:
                log_dict[f'Train Performance {suffix}'] = train_perf
                log_dict[f'Val Performance {suffix}'] = valid_perf
                log_dict[f'Test Performance {suffix}'] = test_perf
                log_dict[f'Train Loss {suffix}'] = epoch_train_loss
                log_dict[f'Val Loss {suffix}'] = epoch_val_loss
                log_dict[f'Test Loss {suffix}'] = epoch_test_loss
                log_dict[f'Epoch {suffix}'] = epoch

            # Update best val epoch (link prediction metrics are maximized)
            if valid_perf >= valid_curve[best_val_epoch]:
                best_val_epoch = epoch - 1
                if not self.args.debug:
                    log_dict[f'Best Train Performance {suffix}'] = train_perf
                    log_dict[f'Best Val Performance {suffix}'] = valid_perf
                    log_dict[f'Best Test Performance {suffix}'] = test_perf
                    save_checkpoint(get_checkpoint_state(self.model, self.optimizer, epoch),
                                    self.best_epoch_pt)

            if not self.args.debug:
                wandb.log(log_dict)

        # Final evaluation
        print('Final Evaluation...')
        final_train_perf, _ = self.eval('train')
        final_val_perf, _ = self.eval('val')
        final_test_perf, _ = self.eval('test')

        msg = (
            f'========== Result ============\n'
            f'Dataset:        {self.args.dataset}\n'
            f'------------ Best epoch -----------\n'
            f'Train:          {train_curve[best_val_epoch]}\n'
            f'Validation:     {valid_curve[best_val_epoch]}\n'
            f'Test:           {test_curve[best_val_epoch]}\n'
            f'Best epoch:     {best_val_epoch}\n'
            '------------ Last epoch -----------\n'
            f'Train:          {final_train_perf}\n'
            f'Validation:     {final_val_perf}\n'
            f'Test:           {final_test_perf}\n'
            '-------------------------------\n\n')
        print(msg)

        msg += args_to_string(self.args)

        curves = {
            'train': train_curve,
            'val': valid_curve,
            'test': test_curve,
            'last_val': final_val_perf,
            'last_test': final_test_perf,
            'last_train': final_train_perf,
            'best': best_val_epoch
        }

        if not self.args.debug:
            with open(self.filename, 'w') as handle:
                handle.write(msg)
            wandb.save(self.filename)

        return curves
