import os
import numpy as np
import cv2
import torch
import torchvision.transforms as transforms
from torch.utils.data import Dataset, DataLoader
from sklearn.metrics import classification_report, confusion_matrix
import torch.nn as nn
import torch.optim as optim
from itertools import chain
from functools import wraps
import logging
import random

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

def log_function_call(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        logging.debug(f'Calling function: {func.__name__} with arguments: {args} {kwargs}')
        result = func(*args, **kwargs)
        logging.debug(f'Function {func.__name__} returned: {result}')
        return result
    return wrapper

class ImageProcessor:
    @staticmethod
    @log_function_call
    def load_image(img_path):
        image = cv2.imread(img_path)
        image = cv2.resize(image, (64, 64))
        return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    @staticmethod
    @log_function_call
    def augment_image(image):
        if random.random() > 0.5:
            image = np.fliplr(image)
        if random.random() > 0.5:
            noise = np.random.normal(0, 0.1, image.shape).astype(np.uint8)
            image = cv2.add(image, noise)
        return np.clip(image, 0, 255)

class ImageTransformations:
    def __init__(self):
        self.transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
        ])

    @log_function_call
    def __call__(self, image):
        return self.transform(image)

class ImageDataset(Dataset):
    def __init__(self, damaged_dir, not_damaged_dir, transform=None):
        self.damaged_dir = damaged_dir
        self.not_damaged_dir = not_damaged_dir
        self.transform = transform
        self.images, self.labels = self.load_images()

    @log_function_call
    def load_images(self):
        image_paths = []
        labels = []
        for directory, label in zip([self.damaged_dir, self.not_damaged_dir], [1, 0]):
            for filename in os.listdir(directory):
                img_path = os.path.join(directory, filename)
                image_paths.append(img_path)
                labels.append(label)
        return image_paths, labels

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        img_path = self.images[idx]
        image = ImageProcessor.load_image(img_path)
        image = ImageProcessor.augment_image(image)

        if self.transform:
            image = self.transform(image)

        label = self.labels[idx]
        return image, label

class AdvancedDataLoader:
    def __init__(self, dataset, batch_size=32, shuffle=True):
        self.loader = DataLoader(dataset, batch_size=batch_size, shuffle=shuffle, num_workers=2)

    def get_loader(self):
        return self.loader

class MultiLayeredCNN(nn.Module):
    def __init__(self):
        super(MultiLayeredCNN, self).__init__()
        self.conv_layers = nn.Sequential(
            nn.Conv2d(3, 16, kernel_size=3, stride=1, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(16, 32, kernel_size=3, stride=1, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )
        self.fc_layers = nn.Sequential(
            nn.Flatten(),
            nn.Linear(64 * 8 * 8, 128),
            nn.ReLU(),
            nn.Linear(128, 2)
        )

    def forward(self, x):
        x = self.conv_layers(x)
        x = self.fc_layers(x)
        return x

def initialize_model():
    model = MultiLayeredCNN()
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    return model, criterion, optimizer

def train_model(model, train_loader, criterion, optimizer, num_epochs=10):
    for epoch in range(num_epochs):
        model.train()
        total_loss = 0
        for images, labels in train_loader:
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        
        average_loss = total_loss / len(train_loader)
        logging.info(f'Epoch [{epoch + 1}/{num_epochs}], Average Loss: {average_loss:.4f}')

def evaluate_model(model, test_loader):
    model.eval()
    y_true, y_pred = [], []
    with torch.no_grad():
        for images, labels in test_loader:
            outputs = model(images)
            _, predicted = torch.max(outputs.data, 1)
            y_true.extend(labels.numpy())
            y_pred.extend(predicted.numpy())

    return y_true, y_pred

def calculate_metrics(y_true, y_pred):
    conf_matrix = confusion_matrix(y_true, y_pred)
    class_report = classification_report(y_true, y_pred)
    logging.info("Confusion Matrix:")
    logging.info(conf_matrix)
    logging.info("\nClassification Report:")
    logging.info(class_report)

def save_checkpoint(model, epoch, filename='checkpoint.pth'):
    torch.save({
        'epoch': epoch,
        'model_state_dict': model.state_dict(),
    }, filename)
    logging.info(f'Model saved to {filename} at epoch {epoch}')

def main():
    damaged_directory = os.path.abspath('../data/test/damage')
    not_damaged_directory = os.path.abspath('../data/test/no_damage')

    transform = ImageTransformations()
    dataset = ImageDataset(damaged_directory, not_damaged_directory, transform)
    
    train_size = int(0.8 * len(dataset))
    test_size = len(dataset) - train_size
    train_dataset, test_dataset = torch.utils.data.random_split(dataset, [train_size, test_size])

    train_loader = AdvancedDataLoader(train_dataset).get_loader()
    test_loader = AdvancedDataLoader(test_dataset, shuffle=False).get_loader()

    model, criterion, optimizer = initialize_model()
    train_model(model, train_loader, criterion, optimizer, num_epochs=10)

    y_true, y_pred = evaluate_model(model, test_loader)
    calculate_metrics(y_true, y_pred)

    save_checkpoint(model, 10)