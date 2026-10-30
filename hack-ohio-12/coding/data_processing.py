import os
import numpy as np
from PIL import Image
from sklearn.model_selection import train_test_split

def load_data(damage_dir='data/test/damage/', no_damage_dir='data/test/no_damage/'):
    images = []
    labels = []
    for img_name in os.listdir(damage_dir):
        img_path = os.path.join(damage_dir, img_name)
        img = Image.open(img_path).convert('RGB').resize((64, 64))
        images.append(np.array(img))
        labels.append(1)  
    for img_name in os.listdir(no_damage_dir):
        img_path = os.path.join(no_damage_dir, img_name)
        img = Image.open(img_path).convert('RGB').resize((64, 64))
        images.append(np.array(img))
        labels.append(0)
    X = np.array(images)
    y = np.array(labels)
    X = X.reshape(X.shape[0], -1)
    return train_test_split(X, y, test_size=0.2, random_state=42)