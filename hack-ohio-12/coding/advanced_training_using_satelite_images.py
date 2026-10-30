import time
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import os
from PIL import Image

def load_data():
    damage_dir = 'data/test/damage/'
    no_damage_dir = 'data/test/no_damage/'

    images = []
    labels = []

    # Load damaged images
    for img_name in os.listdir(damage_dir):
        img_path = os.path.join(damage_dir, img_name)
        img = Image.open(img_path).convert('RGB')
        img = img.resize((64, 64))  # Resize as needed
        images.append(np.array(img))
        labels.append(1)  # Damaged

    # Load non-damaged images
    for img_name in os.listdir(no_damage_dir):
        img_path = os.path.join(no_damage_dir, img_name)
        img = Image.open(img_path).convert('RGB')
        img = img.resize((64, 64))  # Resize as needed
        images.append(np.array(img))
        labels.append(0)  # No damage

    # Convert to numpy arrays
    X = np.array(images)
    y = np.array(labels)

    # Flatten the images for Random Forest
    X = X.reshape(X.shape[0], -1)

    return train_test_split(X, y, test_size=0.2, random_state=42)

def train_model(X_train, y_train):
    model = RandomForestClassifier()
    model.fit(X_train, y_train)
    return model

def save_model(model, model_file):
    joblib.dump(model, model_file)

def load_model(model_file):
    return joblib.load(model_file)

def retrain_model(model_file, interval=3600):
    while True:
        X_train, X_test, y_train, y_test = load_data()
        
        try:
            model = load_model(model_file)
        except FileNotFoundError:
            model = None

        if model is None:
            model = train_model(X_train, y_train)
        else:
            model.fit(X_train, y_train)
        
        save_model(model, model_file)
        print("Model retrained and saved. Waiting for the next interval...")
        time.sleep(interval)

model_file = 'scikit_learn_model.pkl'
retrain_model(model_file)
