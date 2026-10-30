import os
import numpy as np
import cv2
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
print(os.listdir())
damaged_directory = '../data/test/damage'
damaged_files = os.listdir(damaged_directory)

not_damaged_directory = '../data/test/no_damage'
not_damaged_files = os.listdir(not_damaged_directory)

def load_images(damaged_directory, not_damaged_directory):
    images = []
    labels = []
    
    for filename in os.listdir(damaged_directory):
        img_path = os.path.join(damaged_directory, filename)
        img = cv2.imread(img_path)
        img = cv2.resize(img, (64, 64))
        images.append(img.flatten())
        labels.append(1)

    for filename in os.listdir(not_damaged_directory):
        img_path = os.path.join(not_damaged_directory, filename)
        img = cv2.imread(img_path)
        img = cv2.resize(img, (64, 64))
        images.append(img.flatten())
        labels.append(0)

    return np.array(images), np.array(labels)

X, y = load_images(damaged_directory, not_damaged_directory)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = DecisionTreeClassifier(random_state=42)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)

print(confusion_matrix(y_test, y_pred))
print(classification_report(y_test, y_pred))
print(f'Accuracy: {accuracy_score(y_test, y_pred):.4f}')