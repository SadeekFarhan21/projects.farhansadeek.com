#!/usr/bin/env python3
"""
Training script for PyTorch Autoencoder
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from utils.simple_data_loader import SimpleMovieLensLoader
from models.pytorch.autoencoder import Autoencoder
import torch
import torch.nn as nn

print("Loading data...")
loader = SimpleMovieLensLoader()
data = loader.process_data(split_id=1, normalize=True)
train_matrix = data['train_matrix'] 
print(f"Training data shape: {train_matrix.shape}")

train_tensor = torch.FloatTensor(train_matrix)
print(f"Training tensor shape: {train_tensor.shape}")

input_size = train_tensor.shape[1]
hidden_size = 100
model = Autoencoder(input_size=input_size, hidden_size=hidden_size)
print(f"Model created with input size {input_size} and hidden size {hidden_size}")

criterion = nn.MSELoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

num_epochs = 100
print(f"Training for {num_epochs} epochs...")

for epoch in range(num_epochs):
    output = model(train_tensor)
    loss = criterion(output, train_tensor)

    optimizer.zero_grad()
    loss.backward()
    optimizer.step()

    if (epoch+1) % 10 == 0:
        print(f"Epoch [{epoch+1}/{num_epochs}], Loss: {loss.item():.4f}")

print("Training complete!")

# Save the trained model
torch.save(model.state_dict(), 'models/pytorch/trained_autoencoder.pth')
print("Model saved to models/pytorch/trained_autoencoder.pth") 