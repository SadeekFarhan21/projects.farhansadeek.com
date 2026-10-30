import joblib
from sklearn.ensemble import RandomForestClassifier
from data_processing import load_data
import time
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