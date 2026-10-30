import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import torch
import torch.nn as nn
import matplotlib.pyplot as plt
import geopandas as gpd
from shapely.geometry import Point
file_path = 'damaged_coordinates.csv'
data = pd.read_csv(file_path)
X = data[['Longitude', 'Latitude']]
y = data[['Longitude', 'Latitude']].shift(-1)
X = X[:-1]
y = y[:-1]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
X_train_tensor = torch.tensor(X_train_scaled, dtype=torch.float32)
y_train_tensor = torch.tensor(y_train.values, dtype=torch.float32)
X_test_tensor = torch.tensor(X_test_scaled, dtype=torch.float32)
class SimpleNN(nn.Module):
    def __init__(self):
        super(SimpleNN, self).__init__()
        self.fc1 = nn.Linear(2, 64)
        self.fc2 = nn.Linear(64, 64)
        self.fc3 = nn.Linear(64, 2)

    def forward(self, x):
        x = torch.relu(self.fc1(x))
        x = torch.relu(self.fc2(x))
        x = self.fc3(x)
        return x
model = SimpleNN()
criterion = nn.MSELoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
for epoch in range(100):
    model.train()
    optimizer.zero_grad()
    outputs = model(X_train_tensor)
    loss = criterion(outputs, y_train_tensor)
    loss.backward()
    optimizer.step()
model.eval()
with torch.no_grad():
    y_pred_scaled = model(X_test_tensor)
    y_pred = scaler.inverse_transform(y_pred_scaled.numpy())
gdf = gpd.GeoDataFrame(geometry=[Point(xy) for xy in zip(X_test['Longitude'], X_test['Latitude'])])
pred_gdf = gpd.GeoDataFrame(geometry=[Point(xy) for xy in y_pred])
world = gpd.read_file(gpd.datasets.get_path('naturalearth_lowres'))
plt.figure(figsize=(15, 10))
ax = world.plot(color='lightgrey', edgecolor='black')
gdf.plot(ax=ax, color='blue', markersize=10, label='Actual Path')
pred_gdf.plot(ax=ax, color='red', markersize=10, label='Predicted Path')
plt.title('Hurricane Path Prediction')
plt.xlabel('Longitude')
plt.ylabel('Latitude')
plt.legend()
plt.show()