from PIL import Image
from pyzbar.pyzbar import decode

def get_upc_from_image(image_path):
    """
    Extracts UPC/barcode data from an image.
    
    Args:
        image_path (str): Path to the barcode image
        
    Returns:
        str: The barcode/UPC number if found, None otherwise
    """
    try:
        img = Image.open(image_path)
        barcodes = decode(img)
        
        if barcodes:
            # Return the first barcode found
            barcode = barcodes[0]
            upc = barcode.data.decode('utf-8')
            barcode_type = barcode.type
            print(f"Barcode detected - Type: {barcode_type}, UPC: {upc}")
            return upc
        else:
            print("No barcode was detected in the image.")
            return None
            
    except Exception as e:
        print(f"Error reading barcode: {e}")
        return None

# Example usage when run directly
if __name__ == "__main__":
    upc = get_upc_from_image("image.png")
    if upc:
        print(f"Extracted UPC: {upc}")
    else:
        print("Failed to extract UPC from image.")