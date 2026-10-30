#!/usr/bin/env python3
"""
Neural Network from Scratch for Movie Recommendations
Complete implementation with all layers, model, and training
"""

import numpy as np
import json
import os
from typing import Dict, List, Tuple

##  Embedding Layer == Converting the user/item IDs into dense vectors
class EmbeddingLayer:
    """Embedding layer for user/item repr```esentations"""
    
    def __init__(self, num_embeddings: int, embedding_dim: int):
        # Initialize with small random values
        self.weight = np.random.normal(0, 0.01, (num_embeddings, embedding_dim))
        self.ids = None
    
    ## Forward Propagation     
    def forward(self, ids: np.ndarray) -> np.ndarray:
        # Cache ids for backward pass
        self.ids = ids
        return self.weight[ids]
        
    def backward(self, grad_out: np.ndarray) -> None:
        # CRITICAL: Use scatter-add for repeated indices
        grad_W = np.zeros_like(self.weight)
        np.add.at(grad_W, self.ids, grad_out)  # Accumulate, don't overwrite
        self.weight_grad = grad_W
        return None


## Dense Layer == Fully connected layer usually from the input to the output layer in this case
class DenseLayer:
    """Dense (fully connected) layer"""
    
    def __init__(self, input_dim: int, output_dim: int):
        # He initialization for better training
        scale = np.sqrt(2.0 / input_dim)
        self.weight = np.random.normal(0, scale, (input_dim, output_dim))
        self.bias = np.zeros(output_dim)
        self.x = None
        
    def forward(self, x: np.ndarray) -> np.ndarray:
        # Cache input for backward pass
        self.x = x
        return x @ self.weight + self.bias
        
    def backward(self, grad_y: np.ndarray) -> np.ndarray:
        # Compute gradients
        self.weight_grad = self.x.T @ grad_y
        self.bias_grad = grad_y.sum(0)
        grad_x = grad_y @ self.weight.T
        return grad_x

## ReLU Layer == Applies the ReLU activation function

class ReLU:
    """ReLU activation function"""
    
    def __init__(self):
        self.z = None
        
    def forward(self, z: np.ndarray) -> np.ndarray:
        # Cache pre-activation for backward pass
        self.z = z
        return np.maximum(0, z)
        
    def backward(self, grad_h: np.ndarray) -> np.ndarray:
        # Use pre-activation z for gradient
        return grad_h * (self.z > 0)


## Adam Optimizer == Adaptive Moment Estimation
class AdamOptimizer:
    """Adam optimizer from scratch"""
    
    def __init__(self, params: Dict, lr: float = 1e-3, beta1: float = 0.9, beta2: float = 0.999, eps: float = 1e-8):
        self.lr = lr
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        
        # Initialize momentum and variance for each parameter
        self.m = {}
        self.v = {}
        for name, param in params.items():
            self.m[name] = np.zeros_like(param)
            self.v[name] = np.zeros_like(param)
    
    def step(self, params: Dict, grads: Dict):
        self.t += 1
        
        for name in params.keys():
            if name in grads and grads[name] is not None:
                # Update momentum and variance
                self.m[name] = self.beta1 * self.m[name] + (1 - self.beta1) * grads[name]
                self.v[name] = self.beta2 * self.v[name] + (1 - self.beta2) * (grads[name] ** 2)
                
                # Bias correction
                m_hat = self.m[name] / (1 - self.beta1 ** self.t)
                v_hat = self.v[name] / (1 - self.beta2 ** self.t)
                
                # Update parameter
                params[name] -= self.lr * m_hat / (np.sqrt(v_hat) + self.eps)

class NeuralCFModel:
    """Neural Collaborative Filtering model for movie recommendations"""
    
    def __init__(self, n_users: int, n_items: int, embedding_dim: int = 64, hidden_dim: int = 128):
        self.n_users = n_users
        self.n_items = n_items
        self.embedding_dim = embedding_dim
        self.hidden_dim = hidden_dim
        
        # Initialize layers
        self.user_embedding = EmbeddingLayer(n_users, embedding_dim)
        self.item_embedding = EmbeddingLayer(n_items, embedding_dim)
        # With Sequential - automatic chaining
        self.network = Sequential(
            DenseLayer(2 * embedding_dim, hidden_dim),
            ReLU(),
            DenseLayer(hidden_dim, 1)
        )
        self.output_layer = DenseLayer(hidden_dim, 1)  # 128 -> 1
        self.global_bias = 0.0  # Will be set to training mean
        
        # Cache for backward pass
        self.user_ids = None
        self.item_ids = None

    def forward(self, user_ids: np.ndarray, item_ids: np.ndarray) -> np.ndarray:
        # Cache for backward pass
        self.user_ids = user_ids
        self.item_ids = item_ids
        
        # Get embeddings
        user_emb = self.user_embedding.forward(user_ids)  # (batch, 64)
        item_emb = self.item_embedding.forward(item_ids)  # (batch, 64)
        
        # Concatenate
        concat = np.concatenate([user_emb, item_emb], axis=1)  # (batch, 128)
        
        # Hidden layer + ReLU
        hidden_pre = self.hidden_layer.forward(concat)  # (batch, 128)
        hidden = self.relu.forward(hidden_pre)  # (batch, 128)
        
        # Output layer
        # output = self.output_layer.forward(hidden)  # (batch, 1)
        output = self.network.forward(concat)

        # Add global bias
        predictions = output.squeeze() + self.global_bias  # (batch,)
        
        return predictions
        
    def backward(self, grad_output: np.ndarray) -> Dict:
        # grad_output comes in as (batch,) - reshape to (batch, 1)
        grad_output = grad_output[:, None]  # (batch, 1)
        
        # Output layer
        grad_hidden = self.output_layer.backward(grad_output)
        
        # ReLU (uses cached pre-activation z)
        grad_hidden_pre = self.relu.backward(grad_hidden)
        
        # Hidden layer
        grad_concat = self.hidden_layer.backward(grad_hidden_pre)
        
        # Split gradients for embeddings
        grad_user_emb = grad_concat[:, :self.embedding_dim]  # (batch, 64)
        grad_item_emb = grad_concat[:, self.embedding_dim:]  # (batch, 64)
        
        # Embeddings (scatter-add handled inside layers)
        self.user_embedding.backward(grad_user_emb)
        self.item_embedding.backward(grad_item_emb)
        
        # Collect all gradients
        grads = {
            'user_embedding': self.user_embedding.weight_grad,
            'item_embedding': self.item_embedding.weight_grad,
            'hidden_weight': self.hidden_layer.weight_grad,
            'hidden_bias': self.hidden_layer.bias_grad,
            'output_weight': self.output_layer.weight_grad,
            'output_bias': self.output_layer.bias_grad
        }
        
        return grads
    
    def get_params(self) -> Dict:
        """Get all parameters for optimizer"""
        return {
            'user_embedding': self.user_embedding.weight,
            'item_embedding': self.item_embedding.weight,
            'hidden_weight': self.hidden_layer.weight,
            'hidden_bias': self.hidden_layer.bias,
            'output_weight': self.output_layer.weight,
            'output_bias': self.output_layer.bias
        }
    
    def set_params(self, params: Dict):
        """Set all parameters from optimizer"""
        self.user_embedding.weight = params['user_embedding']
        self.item_embedding.weight = params['item_embedding']
        self.hidden_layer.weight = params['hidden_weight']
        self.hidden_layer.bias = params['hidden_bias']
        self.output_layer.weight = params['output_weight']
        self.output_layer.bias = params['output_bias']

def mse_loss(predictions: np.ndarray, targets: np.ndarray) -> Tuple[float, np.ndarray]:
    """Mean Squared Error loss"""
    loss = np.mean((predictions - targets) ** 2)
    grad = 2 * (predictions - targets) / len(predictions)
    return loss, grad

def add_weight_decay(grads: Dict, params: Dict, weight_decay: float) -> Dict:
    """Add L2 regularization to gradients (excluding biases)"""
    for name in grads.keys():
        if grads[name] is not None and 'bias' not in name:  # skip biases
            grads[name] += weight_decay * params[name]
    return grads

def create_batches(user_ids: List, item_ids: List, ratings: List, batch_size: int) -> List[Tuple]:
    """Create mini-batches for training"""
    n_samples = len(ratings)
    indices = np.random.permutation(n_samples)
    
    batches = []
    for i in range(0, n_samples, batch_size):
        batch_indices = indices[i:i + batch_size]
        batch_users = np.array([user_ids[j] for j in batch_indices])
        batch_items = np.array([item_ids[j] for j in batch_indices])
        batch_ratings = np.array([ratings[j] for j in batch_indices])
        batches.append((batch_users, batch_items, batch_ratings))
    
    return batches

def train_model(model: NeuralCFModel, train_data: Tuple, val_data: Tuple, 
                lr: float = 1e-3, weight_decay: float = 1e-5, batch_size: int = 4096,
                epochs: int = 30, patience: int = 5) -> Dict:
    """Train the neural network model"""
    
    train_users, train_items, train_ratings = train_data
    val_users, val_items, val_ratings = val_data
    
    # Set global bias to training mean
    model.global_bias = np.mean(train_ratings)
    print(f"Global bias (training mean): {model.global_bias:.3f}")
    
    # Initialize optimizer
    params = model.get_params()
    optimizer = AdamOptimizer(params, lr=lr)
    
    # Training history
    history = {
        'train_loss': [],
        'val_rmse': [],
        'best_val_rmse': float('inf'),
        'best_params': None,
        'patience_counter': 0
    }
    
    print(f"Training for {epochs} epochs...")
    
    for epoch in range(epochs):
        # Training
        model.train()
        total_loss = 0
        num_batches = 0
        
        # Create batches
        batches = create_batches(train_users, train_items, train_ratings, batch_size)
        
        for batch_users, batch_items, batch_ratings in batches:
            # Forward pass
            predictions = model.forward(batch_users, batch_items)
            
            # Compute loss
            loss, grad_output = mse_loss(predictions, batch_ratings)
            
            # Backward pass
            grads = model.backward(grad_output)
            
            # Add weight decay
            grads = add_weight_decay(grads, params, weight_decay)
            
            # Update parameters
            optimizer.step(params, grads)
            model.set_params(params)
            
            total_loss += loss
            num_batches += 1
        
        avg_train_loss = total_loss / num_batches
        
        # Validation
        model.eval()
        val_predictions = model.forward(np.array(val_users), np.array(val_items))
        val_rmse = np.sqrt(np.mean((val_predictions - val_ratings) ** 2))
        
        # Log progress
        history['train_loss'].append(avg_train_loss)
        history['val_rmse'].append(val_rmse)
        
        if (epoch + 1) % 5 == 0:
            print(f"Epoch [{epoch+1}/{epochs}], Train Loss: {avg_train_loss:.4f}, Val RMSE: {val_rmse:.4f}")
        
        # Early stopping
        if val_rmse < history['best_val_rmse']:
            history['best_val_rmse'] = val_rmse
            history['best_params'] = {k: v.copy() for k, v in params.items()}
            history['patience_counter'] = 0
        else:
            history['patience_counter'] += 1
            
        if history['patience_counter'] >= patience:
            print(f"Early stopping at epoch {epoch+1}")
            break
    
    # Restore best parameters
    if history['best_params'] is not None:
        model.set_params(history['best_params'])
        print(f"Best validation RMSE: {history['best_val_rmse']:.4f}")
    
    return history

def save_model(model: NeuralCFModel, filepath: str):
    """Save model parameters to file"""
    params = model.get_params()
    params['global_bias'] = model.global_bias
    params['n_users'] = model.n_users
    params['n_items'] = model.n_items
    params['embedding_dim'] = model.embedding_dim
    params['hidden_dim'] = model.hidden_dim
    
    np.savez(filepath, **params)
    print(f"Model saved to {filepath}")

def load_model(filepath: str) -> NeuralCFModel:
    """Load model parameters from file"""
    data = np.load(filepath)
    
    model = NeuralCFModel(
        n_users=int(data['n_users']),
        n_items=int(data['n_items']),
        embedding_dim=int(data['embedding_dim']),
        hidden_dim=int(data['hidden_dim'])
    )
    
    params = {
        'user_embedding': data['user_embedding'],
        'item_embedding': data['item_embedding'],
        'hidden_weight': data['hidden_weight'],
        'hidden_bias': data['hidden_bias'],
        'output_weight': data['output_weight'],
        'output_bias': data['output_bias']
    }
    
    model.set_params(params)
    model.global_bias = float(data['global_bias'])
    
    print(f"Model loaded from {filepath}")
    return model

def predict_for_user(model: NeuralCFModel, user_id: int, item_ids: np.ndarray) -> np.ndarray:
    """Predict ratings for a user across multiple items"""
    user_ids = np.full(len(item_ids), user_id)
    predictions = model.forward(user_ids, item_ids)
    return np.clip(predictions, 1.0, 5.0)  # Clip to rating range

# Add train/eval methods to model for convenience
def train(self):
    """Set model to training mode"""
    pass  # No dropout or batch norm in this simple model

def eval(self):
    """Set model to evaluation mode"""
    pass  # No dropout or batch norm in this simple model

# Add methods to NeuralCFModel class
NeuralCFModel.train = train
NeuralCFModel.eval = eval

class Sequential:
    """Sequential container for layers"""
    
    def __init__(self, *layers):
        self.layers = layers  # Store all layers in order
        
    def forward(self, x: np.ndarray) -> np.ndarray:
        # Pass input through each layer sequentially
        for layer in self.layers:
            x = layer.forward(x)  # Output of one layer becomes input to next
        return x
        
    def backward(self, grad_y: np.ndarray) -> np.ndarray:
        # Backpropagate through layers in reverse order
        for layer in reversed(self.layers):
            grad_y = layer.backward(grad_y)
        return grad_y