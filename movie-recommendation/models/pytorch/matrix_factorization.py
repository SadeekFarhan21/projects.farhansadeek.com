#!/usr/bin/env python3
"""
Matrix Factorization for Movie Recommendations
Battle-tested approach for MovieLens-100K
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

class MatrixFactorization(nn.Module):
    """
    Biased Matrix Factorization with user/item embeddings and biases
    Prediction: r_ui = μ + b_u + b_i + <p_u, q_i>
    """
    
    def __init__(self, n_users, n_items, embedding_dim=64):
        super().__init__()
        self.n_users = n_users
        self.n_items = n_items
        self.embedding_dim = embedding_dim
        
        # User and item embeddings
        self.user_embeddings = nn.Embedding(n_users, embedding_dim)
        self.item_embeddings = nn.Embedding(n_items, embedding_dim)
        
        # User and item biases
        self.user_biases = nn.Embedding(n_users, 1)
        self.item_biases = nn.Embedding(n_items, 1)
        
        # Global mean
        self.global_mean = nn.Parameter(torch.tensor(0.0))
        
        # Initialize weights
        self._init_weights()
    
    def _init_weights(self):
        """Initialize weights for better training"""
        nn.init.normal_(self.user_embeddings.weight, mean=0, std=0.05)
        nn.init.normal_(self.item_embeddings.weight, mean=0, std=0.05)
        nn.init.zeros_(self.user_biases.weight)
        nn.init.zeros_(self.item_biases.weight)
    
    def forward(self, user_ids, item_ids):
        """
        Forward pass
        
        Args:
            user_ids: (batch_size,) - user indices
            item_ids: (batch_size,) - item indices
        
        Returns:
            predictions: (batch_size,) - predicted ratings
        """
        # Get embeddings and biases
        user_emb = self.user_embeddings(user_ids)  # (batch_size, embedding_dim)
        item_emb = self.item_embeddings(item_ids)  # (batch_size, embedding_dim)
        user_bias = self.user_biases(user_ids).squeeze(-1)  # (batch_size,)
        item_bias = self.item_biases(item_ids).squeeze(-1)  # (batch_size,)
        
        # Compute prediction: μ + b_u + b_i + <p_u, q_i>
        interaction = (user_emb * item_emb).sum(dim=-1)  # (batch_size,)
        prediction = self.global_mean + user_bias + item_bias + interaction
        
        return prediction
    
    def predict_for_user(self, user_id, item_ids):
        """
        Predict ratings for a user across multiple items
        
        Args:
            user_id: int - user index
            item_ids: (n_items,) - item indices
        
        Returns:
            predictions: (n_items,) - predicted ratings
        """
        self.eval()
        with torch.no_grad():
            user_ids = torch.full((len(item_ids),), user_id, dtype=torch.long)
            predictions = self.forward(user_ids, item_ids)
        return predictions
    
    def get_user_embedding(self, user_id):
        """Get user embedding"""
        return self.user_embeddings(torch.tensor([user_id]))
    
    def get_item_embedding(self, item_id):
        """Get item embedding"""
        return self.item_embeddings(torch.tensor([item_id]))

def adapt_new_user(model, rated_item_ids, ratings, embedding_dim=64, lr=0.01, steps=200, weight_decay=1e-2):
    """
    Adapt model for a new user with few ratings
    
    Args:
        model: trained MatrixFactorization model
        rated_item_ids: list of item indices the user rated
        ratings: list of ratings (1-5 scale)
        embedding_dim: embedding dimension
        lr: learning rate for adaptation
        steps: number of gradient steps
        weight_decay: L2 regularization
    
    Returns:
        user_embedding: adapted user embedding
        user_bias: adapted user bias
    """
    # Freeze item and global parameters
    for param in [model.item_embeddings.weight, model.item_biases.weight, model.global_mean]:
        param.requires_grad_(False)
    
    # Create new user parameters (initialize bias closer to user's average)
    user_embedding = nn.Parameter(torch.zeros(embedding_dim))
    user_bias = nn.Parameter(torch.tensor(np.mean(ratings) - model.global_mean.item()))
    
    # Optimizer for new user parameters only (lighter regularization on bias)
    optimizer = torch.optim.Adam([
        {"params": [user_embedding], "weight_decay": weight_decay},
        {"params": [user_bias], "weight_decay": 1e-3}
    ], lr=lr)
    
    # Convert to tensors
    item_ids = torch.tensor(rated_item_ids, dtype=torch.long)
    target_ratings = torch.tensor(ratings, dtype=torch.float32)
    
    # Adaptation loop
    for step in range(steps):
        # Get item embeddings and biases
        item_emb = model.item_embeddings(item_ids)  # (n_rated, embedding_dim)
        item_bias = model.item_biases(item_ids).squeeze(-1)  # (n_rated,)
        
        # Compute predictions
        interaction = (item_emb * user_embedding).sum(dim=-1)  # (n_rated,)
        predictions = model.global_mean + user_bias + item_bias + interaction
        
        # Compute loss (no clamping - let gradients flow naturally)
        loss = F.smooth_l1_loss(predictions, target_ratings, beta=1.0)
        
        # Backward pass
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
    
    return user_embedding.detach(), user_bias.detach()

def score_all_items_for_user(model, user_embedding, user_bias):
    """
    Score all items for a user using their adapted embedding
    
    Args:
        model: trained MatrixFactorization model
        user_embedding: user embedding vector
        user_bias: user bias scalar
    
    Returns:
        predictions: (n_items,) - predicted ratings for all items
    """
    model.eval()
    with torch.no_grad():
        # Get all item embeddings and biases
        item_embeddings = model.item_embeddings.weight  # (n_items, embedding_dim)
        item_biases = model.item_biases.weight.squeeze(-1)  # (n_items,)
        
        # Compute predictions for all items
        interaction = (item_embeddings * user_embedding).sum(dim=-1)  # (n_items,)
        predictions = model.global_mean + user_bias + item_biases + interaction
    
    return predictions 