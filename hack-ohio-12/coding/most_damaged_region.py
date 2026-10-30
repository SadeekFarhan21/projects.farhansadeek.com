import os

damanged = 'data/test/damage'
not_damaged = 'data/test/no_damage'

damaged_files = os.listdir(damanged)
not_damaged_files = os.listdir(not_damaged)

for file in damaged_files:
    
    file = os.path.splitext(file)[0]
    file = file.split('_')
    longitude = float(file[0])
    latitude = float(file[1])
    print(file)

import os
import csv

damaged = 'data/test/damage'
not_damaged = 'data/test/no_damage'
damaged_files = os.listdir(damaged)
with open('damaged_coordinates.csv', mode='w', newline='') as csv_file:
    csv_writer = csv.writer(csv_file)
    csv_writer.writerow(['Longitude', 'Latitude'])
    for file in damaged_files:
        file_name = os.path.splitext(file)[0]
        parts = file_name.split('_')
        if len(parts) >= 2:
            longitude = float(parts[0])
            latitude = float(parts[1])
            csv_writer.writerow([longitude, latitude])
