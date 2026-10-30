import requests
from PIL import Image
from io import BytesIO

def get_satellite_image(api_key, location, zoom=16, size="640x640"):
    """Fetches a satellite image for a given location using Google Maps Static API."""
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
        print(f"Error fetching image: {response.status_code}")
        return None