#!/usr/bin/env python3
"""
PyTorch Autoencoder for Movie Recommendations
"""

import torch
import torch.nn as nn

class Autoencoder(nn.Module):
    def __init__(self, input_size=1682, hidden_size=100):
        super().__init__()
        self.encoder = nn.Linear(input_size, hidden_size)
        self.decoder = nn.Linear(hidden_size, input_size)
    
    def forward(self, x):
        encoded = torch.relu(self.encoder(x))
        decoded = torch.sigmoid(self.decoder(encoded))
        return decoded 