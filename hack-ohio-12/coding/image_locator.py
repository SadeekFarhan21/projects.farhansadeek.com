import os
import requests
from PIL import Image
from io import BytesIO

damaged = 'data/test/damage'
not_damaged = 'data/test/no_damage'

#damaged_files = os.listdir(damaged)
#print(damaged_files)

filename = '-93.72939699999999_29.787028000000003.jpeg'
filename = os.path.splitext(filename)[0]
filename = filename.split('_')
longitude = float(filename[0])
latitude = float(filename[1])
print(longitude, latitude)
# print(longitude + ',' + latitude)

def get_satellite_image(api_key, location, zoom=16, size="640x640"):
   
    base_url = "https://maps.googleapis.com/maps/api/staticmap"
    params = {
        "center": location,
        "zoom": zoom,
        "size": size,
        "maptype": "satellite",
        "key": api_key
    }
    response = requests.get(base_url, params=params)
    if response.status_code == 200: 
        image = Image.open(BytesIO(response.content))
        image.show()  # Display the image
        return image
    else:
        print(f"Error: {response.status_code}")
        return None
api_key = 'GOOGLE_MAPS_API_KEY'
location = f"{longitude:.4f},{latitude:.4f}"
satellite_image = get_satellite_image(api_key, location)