import requests
from barcode_to_text import get_upc_from_image

def get_ingredients_from_upc(upc):
    """
    Attempts to fetch ingredients for a given UPC using the Open Food Facts API.
    
    Args:
        upc (str): The UPC/barcode number
        
    Returns:
        str: Ingredients text if found, error message otherwise
    """
    url = f"https://world.openfoodfacts.org/api/v0/product/{upc}.json"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            product = data.get("product", {})
            # Try to get ingredients from the product record
            ingredients = product.get("ingredients_text") or product.get("ingredients_text_en") or product.get("ingredients_text_debug")
            if ingredients:
                return ingredients
            else:
                return "Ingredients not found in product data."
        else:
            return f"Error: Received HTTP status code {response.status_code}"
    except Exception as e:
        return f"An error occurred: {e}"

# Example usage when run directly
if __name__ == "__main__":
    # Get UPC from barcode image
    upc = get_upc_from_image("image.png")
    
    if upc:
        print(f"\nFetching ingredients for UPC: {upc}")
        print("-" * 50)
        ingredients = get_ingredients_from_upc(upc)
        print("Ingredients list:")
        print(ingredients)
    else:
        print("Could not extract UPC from image.")
