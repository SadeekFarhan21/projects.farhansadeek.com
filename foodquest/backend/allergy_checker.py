"""
Allergy checker module - detects allergens in ingredient lists
"""

# Common allergens database
COMMON_ALLERGENS = {
    "milk": ["milk", "lait", "dairy", "lactose", "whey", "lactosérum", "cream", "butter", "cheese", "yogurt"],
    "eggs": ["egg", "oeuf", "œuf", "albumin"],
    "fish": ["fish", "poisson", "anchovy", "sardine", "tuna"],
    "shellfish": ["shellfish", "crab", "lobster", "shrimp", "prawn", "crayfish"],
    "tree_nuts": ["almond", "cashew", "walnut", "pecan", "pistachio", "macadamia", "hazelnut", "noix"],
    "peanuts": ["peanut", "arachide", "groundnut"],
    "wheat": ["wheat", "blé", "flour", "farine"],
    "soybeans": ["soy", "soja", "soybean", "tofu"],
    "gluten": ["gluten", "wheat", "barley", "orge", "rye", "seigle", "malt"],
    "sesame": ["sesame", "sésame", "tahini"],
    "mustard": ["mustard", "moutarde"],
    "celery": ["celery", "céleri"],
    "sulfites": ["sulfite", "sulphite", "sulfur dioxide"],
    "lupin": ["lupin", "lupine"]
}

def check_allergies(ingredients_text, user_allergens):
    """
    Checks if any allergens are present in the ingredients.
    
    Args:
        ingredients_text (str): The ingredients text from the product
        user_allergens (list): List of allergen categories the user is allergic to
                              (e.g., ["milk", "eggs", "peanuts"])
    
    Returns:
        dict: {
            "safe": bool,
            "found_allergens": list of allergen categories found,
            "details": list of specific ingredients that matched
        }
    """
    if not ingredients_text or ingredients_text.startswith("Error") or "not found" in ingredients_text:
        return {
            "safe": None,
            "found_allergens": [],
            "details": [],
            "message": "Cannot check allergies - ingredients data not available"
        }
    
    ingredients_lower = ingredients_text.lower()
    found_allergens = []
    details = []
    
    for allergen_category in user_allergens:
        if allergen_category.lower() in COMMON_ALLERGENS:
            allergen_keywords = COMMON_ALLERGENS[allergen_category.lower()]
            
            for keyword in allergen_keywords:
                if keyword.lower() in ingredients_lower:
                    if allergen_category not in found_allergens:
                        found_allergens.append(allergen_category)
                    details.append(f"⚠️  {allergen_category.upper()}: Found '{keyword}' in ingredients")
                    break
    
    safe = len(found_allergens) == 0
    
    return {
        "safe": safe,
        "found_allergens": found_allergens,
        "details": details,
        "message": "✅ Safe to consume" if safe else "🚨 ALLERGEN ALERT - Contains allergens you're sensitive to!"
    }

def get_user_allergens():
    """
    Returns the user's allergen list.
    Modify this list to match your allergies.
    
    Returns:
        list: List of allergen categories the user is allergic to
    """
    # CUSTOMIZE THIS LIST WITH YOUR ALLERGIES
    # Available allergens: milk, eggs, fish, shellfish, tree_nuts, peanuts, 
    #                     wheat, soybeans, gluten, sesame, mustard, celery, sulfites, lupin
    
    user_allergens = [
        "peanuts",
        "tree_nuts",
        # "milk",
        # "eggs",
        # "gluten",
    ]
    
    return user_allergens

def print_allergen_report(allergy_result):
    """
    Prints a formatted allergy check report.
    
    Args:
        allergy_result (dict): Result from check_allergies()
    """
    print("\n" + "=" * 60)
    print("ALLERGY CHECK")
    print("=" * 60)
    
    if allergy_result["safe"] is None:
        print(f"⚠️  {allergy_result['message']}")
    elif allergy_result["safe"]:
        print(f"✅ {allergy_result['message']}")
        print("No allergens detected from your profile.")
    else:
        print(f"🚨 {allergy_result['message']}")
        print(f"\nFound {len(allergy_result['found_allergens'])} allergen(s):")
        for detail in allergy_result["details"]:
            print(f"  {detail}")
    
    print("=" * 60)

# Example usage
if __name__ == "__main__":
    # Test with sample ingredients
    test_ingredients = "Sugar, Milk, Peanuts, Wheat flour, Soy lecithin"
    user_allergies = ["peanuts", "milk"]
    
    result = check_allergies(test_ingredients, user_allergies)
    print_allergen_report(result)
