"""
Main workflow for barcode scanning:
1. Capture image from webcam
2. Extract barcode/UPC using Google Cloud Vision API
3. Fetch product information from OpenFoodFacts
"""

from webcam_capture import capture_barcode_image
from barcode_to_text import get_upc_from_image_api
from text_to_ingredients import get_product_info_from_upc

def scan_barcode_and_get_product_info(camera_index=0, auto_capture=False):
    """
    Complete workflow: Capture barcode from webcam, extract UPC, and get product info.
    
    Args:
        camera_index (int): Index of the camera to use
        auto_capture (bool): If True, auto-capture after 3 seconds; if False, manual capture
        
    Returns:
        dict: Product information if successful, None otherwise
    """
    print("=" * 60)
    print("Barcode Scanner - Product Information Lookup")
    print("=" * 60)
    
    # Step 1: Capture image from webcam
    print("\n[Step 1] Capturing image from webcam...")
    if auto_capture:
        from webcam_capture import capture_barcode_image_auto
        image_path = capture_barcode_image_auto(timeout=3)
    else:
        image_path = capture_barcode_image(camera_index=camera_index)
    
    if not image_path:
        print("❌ Failed to capture image")
        return None
    
    print(f"✅ Image captured: {image_path}")
    
    # Step 2: Extract barcode/UPC from image using Cloud Vision API
    print("\n[Step 2] Extracting barcode from image using Cloud Vision API...")
    upc = get_upc_from_image_api(image_path)
    
    if not upc:
        print("❌ Could not extract barcode from image")
        return None
    
    print(f"✅ Barcode extracted: {upc}")
    
    # Step 3: Fetch product information from OpenFoodFacts
    print("\n[Step 3] Fetching product information from OpenFoodFacts...")
    product_info = get_product_info_from_upc(upc)
    
    if not product_info:
        print("❌ Product not found in OpenFoodFacts database")
        return None
    
    print("✅ Product information retrieved!")
    
    # Display product information
    print("\n" + "=" * 60)
    print("PRODUCT INFORMATION")
    print("=" * 60)
    print(f"Name: {product_info['name']}")
    print(f"Brand: {product_info['brand']}")
    print(f"Quantity: {product_info['quantity']}")
    print(f"Nutrition Grade: {product_info['nutrition_grade']}")
    print(f"\nIngredients:")
    print(product_info['ingredients'])
    
    if product_info['allergens']:
        print(f"\nAllergens: {product_info['allergens']}")
    
    if product_info['categories']:
        print(f"\nCategories: {', '.join(product_info['categories'][:5])}")
    
    print("=" * 60)
    
    return product_info

if __name__ == "__main__":
    # Run the complete workflow
    # Set auto_capture=True for automatic capture after 3 seconds
    # Set auto_capture=False to manually capture with SPACE key
    product_info = scan_barcode_and_get_product_info(auto_capture=False)
    
    if product_info:
        print("\n✅ Scan completed successfully!")
    else:
        print("\n❌ Scan failed. Please try again.")
