"""
Main workflow: Barcode scanning → UPC extraction → Ingredients lookup → Allergy check
Run this file to execute the complete workflow.
"""

from barcode_to_text import get_upc_from_image
from text_to_ingredients import get_ingredients_from_upc
from allergy_checker import get_user_allergens, check_allergies, print_allergen_report

def main():
    # Step 1: Extract UPC from barcode image
    print("=" * 60)
    print("STEP 1: Extracting UPC from barcode image...")
    print("=" * 60)
    upc = get_upc_from_image("image.png")
    
    if not upc:
        print("\n❌ Failed to extract UPC from image.")
        return
    
    # Step 2: Fetch ingredients from Open Food Facts API
    print("\n" + "=" * 60)
    print("STEP 2: Fetching ingredients from Open Food Facts API...")
    print("=" * 60)
    print(f"UPC: {upc}")
    
    ingredients = get_ingredients_from_upc(upc)
    
    # Step 3: Display ingredients
    print("\n" + "=" * 60)
    print("INGREDIENTS")
    print("=" * 60)
    print(f"Product UPC: {upc}")
    print(f"\n{ingredients}")
    
    # Step 4: Check for allergens
    user_allergens = get_user_allergens()
    print("\n" + "=" * 60)
    print(f"STEP 3: Checking for allergens...")
    print("=" * 60)
    print(f"Your allergen profile: {', '.join(user_allergens) if user_allergens else 'None specified'}")
    
    if user_allergens:
        allergy_result = check_allergies(ingredients, user_allergens)
        print_allergen_report(allergy_result)
    else:
        print("\n⚠️  No allergens specified in your profile.")
        print("Edit 'get_user_allergens()' in allergy_checker.py to add your allergies.")
        print("=" * 60)

if __name__ == "__main__":
    main()
