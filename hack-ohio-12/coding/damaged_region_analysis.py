import pandas as pd
import math
import folium
from sklearn.cluster import DBSCAN
import numpy as np

def haversine(lat1, lon1, lat2, lon2):
    R = 3956
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

data = pd.read_csv('damaged_coordinates.csv').dropna(subset=['Latitude', 'Longitude']).sample(100)
data['Incident_Count'] = 1
coords = data[['Latitude', 'Longitude']].to_numpy()
dbscan = DBSCAN(eps=0.5, min_samples=5, metric='haversine')
data['Cluster'] = dbscan.fit_predict(np.radians(coords))
cluster_counts = data.groupby('Cluster').agg({'Incident_Count': 'sum'}).reset_index()
largest_cluster = cluster_counts[cluster_counts['Cluster'] != -1].nlargest(1, 'Incident_Count')

if not largest_cluster.empty:
    largest_cluster_id = largest_cluster['Cluster'].values[0]
    largest_cluster_count = largest_cluster['Incident_Count'].values[0]
    largest_cluster_data = data[data['Cluster'] == largest_cluster_id]

    print(f"Largest cluster has {largest_cluster_count} incidents.")
    print(f"Largest cluster has {largest_cluster_count} incidents.")

    map_center = [largest_cluster_data['Latitude'].mean(), largest_cluster_data['Longitude'].mean()]
    m = folium.Map(location=map_center, zoom_start=12)

    for _, row in largest_cluster_data.iterrows():
        folium.Marker(
            location=(row['Latitude'], row['Longitude']),
            popup=f"Incident Count: 1",
            icon=None
        ).add_to(m)

    m.save('largest_cluster_map.html')
    print("Map with the largest cluster saved to 'largest_cluster_map.html'.")
else:
    print("No valid clusters found.")