import urllib.request
import json

barcode = "3017620422003" # Nutella
url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"

try:
    with urllib.request.urlopen(url) as response:
        if response.status == 200:
            data = json.loads(response.read().decode())
            product = data.get('product', {})
            print("Available Top Level Keys:", list(product.keys())[:20])
            
            # Specific interesting fields
            interesting_fields = [
                'nutrient_levels', 
                'allergens_tags', 
                'additives_tags', 
                'labels_tags', 
                'countries', 
                'stores', 
                'traces_tags'
            ]
            
            print("\n--- Interesting Data ---")
            for field in interesting_fields:
                if field in product:
                    print(f"{field}: {product[field]}")
                    
            # Nutriments keys
            if 'nutriments' in product:
                print("\n--- Nutriment Keys ---")
                print(list(product['nutriments'].keys())[:15])
                
        else:
            print(f"Failed: {response.status}")
except Exception as e:
    print(f"Error: {e}")
