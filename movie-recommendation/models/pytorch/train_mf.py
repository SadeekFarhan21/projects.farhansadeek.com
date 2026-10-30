#!/usr/bin/env python3
"""
Training script for Matrix Factorization
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from utils.simple_data_loader import SimpleMovieLensLoader
from models.pytorch.matrix_factorization import MatrixFactorization
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import pandas as pd
from tqdm import tqdm
import random

def create_training_data(train_matrix):
    """
    Create training data from sparse matrix
    
    Args:
        train_matrix: (n_users, n_items) sparse matrix with ratings
    
    Returns:
        user_ids: list of user indices
        item_ids: list of item indices  
        ratings: list of ratings
    """
    user_ids = []
    item_ids = []
    ratings = []
    
    # Get all non-zero ratings
    for user_idx in range(train_matrix.shape[0]):
        for item_idx in range(train_matrix.shape[1]):
            rating = train_matrix[user_idx, item_idx]
            if rating > 0:  # Non-zero rating
                user_ids.append(user_idx)
                item_ids.append(item_idx)
                ratings.append(rating)
    
    return user_ids, item_ids, ratings

def train_matrix_factorization():
    """Train the Matrix Factorization model"""
    
    print("Loading data...")
    loader = SimpleMovieLensLoader()
    data = loader.process_data(split_id=1, normalize=False)  # Don't normalize for MF
    
    train_matrix = data['train_matrix']
    test_matrix = data['test_matrix']
    
    n_users, n_items = train_matrix.shape
    print(f"Training data shape: {train_matrix.shape}")
    print(f"Users: {n_users}, Items: {n_items}")
    
    # Create training data
    user_ids, item_ids, ratings = create_training_data(train_matrix)
    print(f"Total ratings: {len(ratings)}")
    
    # Convert to tensors
    user_ids_tensor = torch.LongTensor(user_ids)
    item_ids_tensor = torch.LongTensor(item_ids)
    ratings_tensor = torch.FloatTensor(ratings)
    
    # Create model
    model = MatrixFactorization(
        n_users=n_users,
        n_items=n_items,
        embedding_dim=64
    )
    
    # Training parameters
    optimizer = optim.Adam(model.parameters(), lr=0.001, weight_decay=1e-5)
    criterion = nn.MSELoss()
    num_epochs = 50
    batch_size = 1024
    
    print(f"Training for {num_epochs} epochs...")
    
    # Training loop
    model.train()
    for epoch in range(num_epochs):
        total_loss = 0
        num_batches = 0
        
        # Create batches
        indices = torch.randperm(len(ratings_tensor))
        
        for i in range(0, len(indices), batch_size):
            batch_indices = indices[i:i+batch_size]
            
            batch_users = user_ids_tensor[batch_indices]
            batch_items = item_ids_tensor[batch_indices]
            batch_ratings = ratings_tensor[batch_indices]
            
            # Forward pass
            predictions = model(batch_users, batch_items)
            loss = criterion(predictions, batch_ratings)
            
            # Backward pass
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            num_batches += 1
        
        avg_loss = total_loss / num_batches
        
        if (epoch + 1) % 5 == 0:
            print(f"Epoch [{epoch+1}/{num_epochs}], Loss: {avg_loss:.4f}")
    
    print("Training complete!")
    
    # Evaluate on test set
    print("Evaluating on test set...")
    model.eval()
    
    test_user_ids, test_item_ids, test_ratings = create_training_data(test_matrix)
    
    if len(test_ratings) > 0:
        test_user_ids_tensor = torch.LongTensor(test_user_ids)
        test_item_ids_tensor = torch.LongTensor(test_item_ids)
        test_ratings_tensor = torch.FloatTensor(test_ratings)
        
        with torch.no_grad():
            test_predictions = model(test_user_ids_tensor, test_item_ids_tensor)
            test_predictions = torch.clamp(test_predictions, 1.0, 5.0)
            
            mse = criterion(test_predictions, test_ratings_tensor)
            mae = torch.mean(torch.abs(test_predictions - test_ratings_tensor))
            
            print(f"Test MSE: {mse.item():.4f}")
            print(f"Test MAE: {mae.item():.4f}")
    
    # Save model
    model_path = 'models/pytorch/trained_mf_model.pth'
    torch.save({
        'model_state_dict': model.state_dict(),
        'n_users': n_users,
        'n_items': n_items,
        'embedding_dim': 64
    }, model_path)
    
    print(f"Model saved to {model_path}")
    
    return model, data

if __name__ == "__main__":
    train_matrix_factorization() 