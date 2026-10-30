import requests
from barcode_to_text import get_upc_from_image

def get_product_info_from_upc(upc):
    """
    Fetches comprehensive product information for a given UPC using the Open Food Facts API.
    
    Args:
        upc (str): The UPC/barcode number
        
    Returns:
        dict: Product information including name, ingredients, allergens, nutrition, etc.
              Returns None if product not found or error occurred
    """
    url = f"https://world.openfoodfacts.org/api/v0/product/{upc}.json"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            
            # Check if product was found
            if data.get("status") == 1:
                product = data.get("product", {})
                
                # Extract comprehensive product information
                product_info = {
                    "name": product.get("product_name") or product.get("product_name_en") or "Unknown",
                    "brand": product.get("brands") or "Unknown",
                    "ingredients": product.get("ingredients_text") or product.get("ingredients_text_en") or "Not available",
                    "allergens": product.get("allergens") or product.get("allergens_tags") or [],
                    "nutrition_grade": product.get("nutrition_grade_fr") or product.get("nutriscore_grade") or "Unknown",
                    "categories": product.get("categories") or product.get("categories_tags") or [],
                    "image_url": product.get("image_url") or product.get("image_front_url") or None,
                    "quantity": product.get("quantity") or "Not specified",
                    "labels": product.get("labels") or product.get("labels_tags") or [],
                    "nutriments": product.get("nutriments") or {},
                }
                
                return product_info
            else:
                return None
        else:
            return None
    except Exception as e:
        print(f"Error fetching product info: {e}")
        return None

def get_ingredients_from_upc(upc):
    """
    Attempts to fetch ingredients for a given UPC using the Open Food Facts API.
    
    Args:
        upc (str): The UPC/barcode number
        
    Returns:
        str: Ingredients text if found, error message otherwise
    """
    product_info = get_product_info_from_upc(upc)
    if product_info:
        return product_info.get("ingredients", "Ingredients not found in product data.")
    else:
        return "Product not found or error occurred."

# Example usage when run directly
if __name__ == "__main__":
    # Get UPC from barcode image
    upc = get_upc_from_image("image.png")
    
    if upc:
        print(f"\nFetching product information for UPC: {upc}")
        print("-" * 50)
        
        product_info = get_product_info_from_upc(upc)
        
        if product_info:
            print(f"Product Name: {product_info['name']}")
            print(f"Brand: {product_info['brand']}")
            print(f"\nIngredients:")
            print(product_info['ingredients'])
            print(f"\nNutrition Grade: {product_info['nutrition_grade']}")
            if product_info['allergens']:
                print(f"Allergens: {product_info['allergens']}")
        else:
            print("Product not found in OpenFoodFacts database.")
    else:
        print("Could not extract UPC from image.")
